(function() {
    
var log = PolyMLext.log;
var error = PolyMLext.error;

// PARTIAL WORKAROUND for Function.prototype.bind
if (!Function.prototype.bind)
    Function.prototype.bind = function(context /*, arg1, arg2... */) {
        'use strict';
        if (typeof this !== 'function') throw new TypeError();
        var _slice = Array.prototype.slice,
            _concat = Array.prototype.concat,
            _arguments = _slice.call(arguments, 1),
            _this = this,
            _function = function() {
                return _this.apply(this instanceof _dummy ? this : context,
                    _concat.call(_arguments, _slice.call(arguments, 0)));
            },
            _dummy = function() {};
        _dummy.prototype = _this.prototype;
        _function.prototype = new _dummy();
        return _function;
};

/*
 Poly represents the PolyML instance. It's actually an interface to the PolyML
 process. It communicates with it via the sockets.
*/
PolyMLext.Poly = function(document, console) {
    this.document = document;
    this.console = console;
}
PolyMLext.Poly.prototype = {
    process : null,
    document : null,
    enabled : false,
    
    init : function() {
        PolyMLext.debug.profile(";Initializing Poly;");
        this.enabled = true;
        this.console.setStatus({s:"Initializing..."});
        this.socket1 = new Socket1(this);
        this.socket2 = new Socket2();
        this.sandbox = new Sandbox();
        this.evaluator = new Evaluator(this);
        this.startPolyProcess();
        this.jswrapper = new PolyMLext.JSWrapper(this);
        PolyMLext.debug.profile(";Finished initializing Poly;");
    },
    
    startPolyProcess : function () {
        var bin = Utils.getExtensionPath();
        bin.append("poly");
        bin.append("bin");
        bin.append("polyml.sh");
        var args = [this.socket1.port(),
                    this.socket2.port(),
                    this.sandbox.pathStr,];
        if (Utils.isDevelopmentMode()) {
            args.push("dev");
        } else {
            args.push("production");
        }
        if (PolyMLext.BrowserUI.prefs.PolyMLPath!="") {
            args.push(PolyMLext.BrowserUI.prefs.PolyMLPath.value);
        }
        this.process = Utils.startProcess(bin, args, false);
    },
    
    stopPolyProcess : function() {
        var bin = Utils.getExtensionPath();
        bin.append("poly");
        bin.append("bin");
        bin.append("kill.sh");
        var args = [this.process.pid];
        var process = Utils.startProcess(bin, args);
    },

    destroy : function() {
        PolyMLext.debug.writeProfilingReport();
        this.stopPolyProcess();
        this.socket1.destroy();
        this.socket2.destroy();
        this.jswrapper.destroy();
        this.evaluator.destroy();
        this.sandbox.destroy();
    },

    onRequest : function(request, id) {
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
                PolyMLext.debug.profile("C;send response;"+id);
                if (typeof(response.message.toString) !== undefined) {
                    response.message = response.message.toString();
                }
                this.sendResponse("0"+response.message);
            }
        } else {
            //exception
            if (response.ret) {
                this.sendResponse("1"+response.message);
            } else {
                this.sendCode("1"+response.message);
            }
        }
    },

    onReady : function() {
        this.console.setStatusDefault();
        this.evaluator.start();
    },
    
    //this is used for sending PolyML code to be evaluated
    //e.g. embedded code, console commands, event code
    sendCode : function(m) {
        this.socket1.send(m);
    },
    
    //this is used only for sending responses to Poly JS Wrappers requests
    sendResponse : function(m) {
        this.socket2.send(m);
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
            ext = ext.substr(1,3);
            this.downloads.pending++;
            
            var self = this;
            var listener = {
                onComplete : function() {
                    self.downloads.complete++;
                    if (self.downloads.pending==self.downloads.complete) {
                        self.processQueue();
                    }
                },
                onError : function() {
                    self.poly.console.error("Could not download file: " + src + "\n");
                },
                onProgressChange : function(percentComplete) {
                    self.poly.console.setStatus({s:"Downloading... "+percentComplete+"%"});
                }
            }
            var destFile = this.poly.sandbox.getPath();
            destFile.append(filename);
            Utils.downloadFile(src, this.poly.document.baseURI, destFile,
                    listener);
            
            //add this 
            return { type:ext, filename:filename }
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
        this.poly.console.setStatus({s: "Compiling..."});
        for (var i in this.queue) {
            var p = this.queue[i];
            switch (p.type) {
                //TODO rename 0 to smth more meaningful
                case 0:
                    this.poly.sendCode("0"+p.code);
                    break;
                case "sml":
                    this.poly.sendCode('0PolyML.use "' + p.filename + '";');
                    break;
                case "zip":
                    //have to wait for the download to finish before unziping
                    try {
                        var zipFile = this.poly.sandbox.getPath();
                        zipFile.append(p.filename);
                        Utils.extractZip(zipFile, this.poly.sandbox.getPath())
                    } catch (e) {
                        error(e);
                        this.poly.console.error(
                                "Could not extract zip file: "
                                + p.filename + "\n");
                    }
                    break;
            }
        }
        this.queue = [];
        this.poly.console.setStatusDefault();
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
        var dir = Utils.getExtensionPath();
        dir.append("sandboxes");
        dir.append(this.hash);
        if (!dir.exists()) {
            break;
        }
    }
    Utils.createDir(dir);
    this.pathStr = dir.path;
    this._path = dir;
}
Sandbox.prototype = {
    pathStr: "",
    _path : null,
    hash : null,
    
    getPath : function() {
        //not using nsIFile.clone() here, because we're always working
        //with nsIFile rather than nsILocalFile
        var aFile = Components.classes["@mozilla.org/file/local;1"]
                .createInstance(Components.interfaces.nsILocalFile);
        aFile.initWithFile(this._path);
        return aFile;
    },
    
    destroy : function() {
        Utils.removeDir(this.getPath());
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
    //TODO: args: port (-1 for random free port), loopback, 
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
       
    requestCounter : 1,
    
    READING_FREQ : 1,
    
    onInputStreamReady : function(input) {
        var bytesToWaitFor = 0;
        if (!this.reading) {
            PolyMLext.debug.profile("B;onInputStreamReady;"+this.requestCounter);
            try {
                //TODO also check here, if we really read as much as we
                //wanted
                var r = this.sin.read(PolyMLext.PREFIX_SIZE);
                if (r.length<PolyMLext.PREFIX_SIZE) {
                    throw "Didn't receive the full prefix.";
                }
            } catch (e) {
                error(e);
                return;
            }
            this.bytesLeft = parseInt(r);
            this.bytesNextChunk = this.bytesLeft > PolyMLext.CHUNK_SIZE ?
                                  PolyMLext.CHUNK_SIZE : this.bytesLeft;
            this.reading = true;
        } else {
            try {
                var chunk = this.sin.read(this.bytesNextChunk);
            } catch (e) {
                error(e);
                return;
            }
            this.request += chunk;
            this.bytesLeft -= chunk.length;
            if (this.bytesLeft == 0) {
                //we're done with reading this request
                this.poly.onRequest(this.request, this.requestCounter);
                this.requestCounter += 1;
                //cleanup
                this.reading = false;
                this.request = "";
                var bytesToWaitFor = PolyMLext.PREFIX_SIZE;
            } else {
                //there is more to read
                this.bytesNextChunk = this.bytesLeft > PolyMLext.CHUNK_SIZE ?
                                      PolyMLext.CHUNK_SIZE : this.bytesLeft;
            }
        }
        
        //wait for the next chunk or request
        if (this.sin.available()>=bytesToWaitFor) {
            this.onInputStreamReady();
        } else {
            this.input.asyncWait(this, 0, bytesToWaitFor, this.tm.mainThread);
        }
    },
    
    tryReadingInput : function() {
        if (!this.reading) {            
            if (this.sin.available()<PolyMLext.PREFIX_SIZE) {
                setTimeout(this.tryReadingInput.bind(this), this.READING_FREQ);
                return;
            }
            
            PolyMLext.debug.profile("B;onInputStreamReady;"+this.requestCounter);
            
            try {
                //TODO also check here, if we really read as much as we
                //wanted
                var r = this.sin.read(PolyMLext.PREFIX_SIZE);
                if (r.length<PolyMLext.PREFIX_SIZE) {
                    throw "Didn't receive the full prefix.";
                }
            } catch (e) {
                error(e);
                return;
            }
            this.bytesLeft = parseInt(r);
            this.bytesNextChunk = this.bytesLeft > PolyMLext.CHUNK_SIZE ?
                                  PolyMLext.CHUNK_SIZE : this.bytesLeft;
            this.reading = true;
        } else {
            try {
                var chunk = this.sin.read(this.bytesNextChunk);
            } catch (e) {
                error(e);
                return;
            }
            this.request += chunk;
            this.bytesLeft -= chunk.length;
            if (this.bytesLeft == 0) {
                //we're done with reading this request
                this.poly.onRequest(this.request, this.requestCounter);
                this.requestCounter += 1;
                //cleanup
                this.reading = false;
                this.request = "";                
            } else {
                //there is more to read
                this.bytesNextChunk = this.bytesLeft > PolyMLext.CHUNK_SIZE ?
                                      PolyMLext.CHUNK_SIZE : this.bytesLeft;
            }
        }
        if (this.sin.available()>0) {
            this.tryReadingInput();
        } else {
            setTimeout(this.tryReadingInput.bind(this), this.READING_FREQ);
        }
    },

    onSocketAccepted : function(serverSocket, clientSocket) {
        this.input = clientSocket.openInputStream(0, 0, 0).
                QueryInterface(Ci.nsIAsyncInputStream);
        this.output = clientSocket.openOutputStream(
                Ci.nsITransport.OPEN_BLOCKING, 0, 0);
        //TODO explain args
        this.sin = Cc["@mozilla.org/scriptableinputstream;1"]
                .createInstance(Ci.nsIScriptableInputStream);
        this.sin.init(this.input);
        this.input.asyncWait(this,0,PolyMLext.PREFIX_SIZE,this.tm.mainThread);
        //setTimeout(this.tryReadingInput.bind(this), this.READING_FREQ);
        this.poly.onReady();
    },

    onStopListening : function() {},

    //can't call send before the socket was accepted
    send : function(data) {
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

    onStopListening : function() {
        //TODO comment
        if (this.poly) {
            this.poly.console.error("PolyML process is gone.\n");
        }
    },

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