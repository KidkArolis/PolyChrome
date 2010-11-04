(function() {
    
var log = PolyMLext.log;
var error = PolyMLext.error;

/*
 Poly represents the PolyML instance. It's actually an interface to the PolyML
 process. It communicates with it via the sockets.
*/
PolyMLext.Poly = function(document, console) {
    this.document = document;
    this.console = console;
    
    this.socket1 = new Socket1(this);
    this.socket2 = new Socket2();
    this.sandbox = new Sandbox(this.socket1, this.document);
    this.evaluator = new Evaluator(this);
    this.startPolyProcess();
    this.jswrapper = new PolyMLext.JSWrapper(this);
}
PolyMLext.Poly.prototype = {
    process : null,
    document : null,
    
    startPolyProcess : function () {        
        var binpath = Utils.getExtensionPath() + "/poly/bin/polyml";
        var args = [this.socket1.port(),
                    this.socket2.port(),
                    this.sandbox.absolutePath];
        if (Utils.isDevelopmentMode()) {
            args.push("dev");
        }
        this.process = Utils.startProcess(binpath, args, false);
    },
    
    stopPolyProcess : function() {
        var binpath = Utils.getExtensionPath() +
                "/poly/bin/stop_child_processes.sh";
        var args = [this.process.pid];
        var process = Utils.startProcess(binpath, args);
    },

    destroy : function() {
        this.stopPolyProcess();
        this.socket1.destroy();
        this.socket2.destroy();
        this.evaluator.destroy();
        this.sandbox.destroy();
        this.jswrapper.destroy();
    },

    onRequest : function(request) {
        /*
         a slightly obscure method. The messages that are sent to poly have to
         be preappended with "0" or "1" indicating succesful processing of the
         request or an exception.
         if the response produces by jswrapper is null
         (response.response==null) then we send the exception to socket1 else
         we send it to socket 2. This is needed, because null response means
         that poly didn't call recv2() but recv()
        */
        
        var response = this.jswrapper.process(request);
        
        if (!response.hasOwnProperty("type")) {
            return;
        }
        
        if (response.type == "response") {
            if (response.ret) {
                if (typeof(response.message.toString) !== undefined) {
                    response.message = response.message.toString();
                }
                this.socket2.send("0"+response.message);
            }
        } else {
            //exception
            if (response.ret) {
                this.socket2.send("1"+response.message);
            } else {
                this.socket1.send("1"+response.message);
            }
        }
    },

    onReady : function() {
        this.evaluator.start();
    },
    
    send : function(m) {
        this.socket1.send(m);
    }
}

/*
 evaluator evaluates all of the code from the document. it could be embedded
 code, sml files or zip files.
*/
var Evaluator = function(poly) {
    this.poly = poly;
    this.downloads = {pending:0, complete:0}
    this.queue = [];
}
Evaluator.prototype = {
    downloadFile : function(src) {
        var filename = src.substring(src.lastIndexOf("/")+1);
        var ext = filename.substr(-4).toLowerCase();
        if (ext==".sml" || ext==".zip") {
            this.downloads.pending++;
            if (ext==".sml") {
                var type = 1;
            } else {
                var type = 2
            }
            
            var self = this;
            var onComplete = function() {
                self.downloads.complete++;
                if (self.downloads.pending==self.downloads.complete) {
                    self.processQueue();
                }
            }
            var status = Utils.downloadFile(src,
                                this.poly.document.baseURI,
                                this.poly.sandbox.absolutePath + filename,
                                onComplete);
            if (status) {
                return {
                    type:type,
                    filename:filename
                }
            } else {
                this.poly.console.error(
                        "Could not download file: " + src + "\n");
            }
        }
        return null;
    },

    start : function() {
        var scripts = this.poly.document.getElementsByTagName("script");
        
        //this shouldn't normally happen, because we already know there
        //are PolyML scripts in the document, but to be cautious if someone
        //removes them by the time this is reached
        if (scripts==null) return;
        
        for (var i=0, len=scripts.length; i<len; i++) {
            if (scripts[i].getAttribute("type")=="application/x-polyml") {
                var src = scripts[i].getAttribute("src");
                if (src==null) {
                    //grab the code from the html
                    var code = scripts[i].innerHTML;
                    var p = {type:0, code:code};
                    this.queue.push(p);
                } else {
                    var p = this.downloadFile(src);
                    if (p!=null) {
                        this.queue.push(p);
                    }
                }
            }
        }
        
        //if there were no downloads involved then process the queue
        //otherwise the processQueue call will be issued by last download
        //progress listener
        if (this.downloads.pending==0) {
            this.processQueue();
        }
    },
    
    processQueue : function() {
        for (var i in this.queue) {
            var p = this.queue[i];
            switch (p.type) {
                case 0:
                    this.poly.send("0"+p.code);
                    break;
                case 1:
                    this.poly.send('0PolyML.use "' + p.filename + '";');
                    break;
                case 2:
                    //have to wait for the download to finish before doing
                    //this
                    var path = this.poly.sandbox.absolutePath;
                    var status = Utils.extractZip(path + p.filename, path);
                    if (!status) {
                        this.poly.console.error(
                                "Could not extract zip file: "
                                + p.filename + "\n");
                    }
                    break;
            }
        }
        this.queue = [];
    },
    
    destroy : function() {}
}

/*
 sandbox deals with the filesystem. it takes care of creating temporary
 disk space for downloaded PolyML applications
*/
var Sandbox = function() {
    //create a new directory with random name      
    while (true) {
        this.hash = Utils.randomString();
        this.absolutePath = Utils.getExtensionPath()
                + "/sandboxes/" + this.hash + "/";
        if (!Utils.fileExists(this.absolutePath)) {
            break;
        }
    }
    Utils.createDir(this.absolutePath);
}
Sandbox.prototype = {
    absolutePath : null,
    hash : null,
    
    destroy : function() {
        Utils.removeDir(this.absolutePath);
    }
}


var Socket = function() {
    
}
Socket.prototype = {
    
}

/*
 this socket is used for sending PolyML code to be evaluated. For example
 the code from the document or the event handling code
*/
var Socket1 = function(poly) {
    this.poly = poly;

    this.tm = Cc["@mozilla.org/thread-manager;1"].getService();
    this.socket = Cc["@mozilla.org/network/server-socket;1"].
            createInstance(Ci.nsIServerSocket);
    this.socket.init(-1, true, -1);
    this.socket.asyncListen(this);
}
Socket1.prototype = {
    //how many bytes are still left to read
    bytesLeft : 0,
    //how many bytes will we try to read
    bytesNextChunk : 0,
    request : "",
    reading : false,
    //scriptableInputStream
    sin : null,
    
    input : null,
    output : null,
       
    onInputStreamReady : function(input) {
        if (!this.reading) {
            this.sin = Cc["@mozilla.org/scriptableinputstream;1"]
                .createInstance(Ci.nsIScriptableInputStream);
            this.sin.init(input);
            try {
                //TODO also check here, if we really read as much as we
                //wanted
                var r = this.sin.read(PolyMLext.PREFIX_SIZE);
            } catch (e) {
                debug.error(e);
                return;
            }
            this.bytesLeft = parseInt(r);            
            this.bytesNextChunk = this.bytesLeft > PolyMLext.CHUNK_SIZE ?
                                  PolyMLext.CHUNK_SIZE : this.bytesLeft;
            this.request = "";
            this.reading = true;
            this.input.asyncWait(this,0,0,this.tm.mainThread);
        } else {
            try {
                var chunk = this.sin.read(this.bytesNextChunk);
            } catch (e) {
                debug.error(e);
                return;
            }
            this.request += chunk;
            this.bytesLeft -= chunk.length;
            if (this.bytesLeft == 0) {
                
                //dump("firefox <--- poly : " + ++counterReceived + "\n");
                //dump(this.request + "\n\n");
                
                //we're done with reading this request
                this.poly.onRequest(this.request);
                //cleanup
                this.reading = false;
                this.request = "";
                //wait for the next request
                this.input.asyncWait(this,0,PolyMLext.PREFIX_SIZE,
                        this.tm.mainThread);
            } else {
                //there is more to read
                this.bytesNextChunk = this.bytesLeft > PolyMLext.CHUNK_SIZE ?
                                      PolyMLext.CHUNK_SIZE : this.bytesLeft;
                //wait for the next chunk
                this.input.asyncWait(this,0,0,this.tm.mainThread);
            }
        }
    },

    onSocketAccepted : function(serverSocket, clientSocket) {
        this.input = clientSocket.openInputStream(
                Ci.nsITransport.OPEN_BLOCKING, 0, 0).
                QueryInterface(Ci.nsIAsyncInputStream);
        this.output = clientSocket.openOutputStream(
                Ci.nsITransport.OPEN_BLOCKING, 0, 0);
        this.input.asyncWait(this,0,PolyMLext.PREFIX_SIZE,this.tm.mainThread);
        this.poly.onReady();
    },

    onStopListening : function() {},

    //can't call send before the socket was accepted
    send : function(data) {
        //dump("firefox ---> poly : " + ++counterSent + "\n");
        //var temp = data;
        //if (data=="") { temp = "-EMPTY STRING-"; }
        //dump(temp + "\n\n");
        
        var prefix = (data.length.toString() +
                Array(PolyMLext.PREFIX_SIZE).join(" "))
                .substring(0, PolyMLext.PREFIX_SIZE);
        var prefixed_data = prefix + data;
        var pos = 0;
        while (pos<prefixed_data.length) {
            var chunk = prefixed_data.substr(pos, PolyMLext.CHUNK_SIZE);
            var nbytes = this.output.write(chunk, chunk.length);
            pos += nbytes;
        }
    },

    port : function() {
        return this.socket.port;
    },
    
    destroy : function() {
        //clear this callback function, because there might still
        //be some events accumulated in firefox, that call these functions
        //after the sockets are closed
        this.onInputStreamReady = function() {};
    
        if (this.input&&this.input.close) {
            this.output.close();
        }
        if (this.output&&this.output.close) {
            this.output.close();
        }
        if (this.socket&&this.socket.close) {
            this.socket.close();
        }
    }
}

/*
 this socket is used only for sending back responses to requests
*/
var Socket2 = function() {
    this.socket = Cc["@mozilla.org/network/server-socket;1"].
            createInstance(Ci.nsIServerSocket);
    this.socket.init(-1, true, -1);
    this.socket.asyncListen(this);
}
Socket2.prototype = {
    output : null,
    
    //can't call send before the socket was accepted
     send : function(data) {        
        //dump("firefox ---> poly : " + ++counterSent + "\n");
        //var temp = data;
        //if (data=="") { temp = "-EMPTY STRING-"; }
        //dump(temp + "\n\n");
        
        var prefix = (data.length.toString() +
                Array(PolyMLext.PREFIX_SIZE).join(" "))
                .substring(0, PolyMLext.PREFIX_SIZE);
        var prefixed_data = prefix + data;
        var pos = 0;
        while (pos<prefixed_data.length) {
            var chunk = prefixed_data.substr(pos, PolyMLext.CHUNK_SIZE);
            var nbytes = this.output.write(chunk, chunk.length);
            pos += nbytes;
        }
    },

    onSocketAccepted : function(serverSocket, clientSocket) {
        this.output = clientSocket.
                openOutputStream(Ci.nsITransport.OPEN_BLOCKING, 0, 0);
    },

    onStopListening : function() {},

    port : function() {
        return this.socket.port;
    },

    destroy : function() {
        if (this.output&&this.output.close) {
            this.output.close();
        }
        if (this.socket&&this.socket.close) {
            this.socket.close();
        }
    }
}

}());