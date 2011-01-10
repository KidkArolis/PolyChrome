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
    this.status = {s:""};
}
PolyMLext.Poly.prototype = {
    process : null,
    document : null,
    enabled : false,
    ready : false,
    status : null,
    
    init : function() {
        this.enabled = true;
        this.setStatus({s:"Initializing..."});
        this.socket1 = new Socket1(this);
        this.socket2 = new Socket2(this);
        this.sandbox = new PolyMLext.Sandbox();
        this.evaluator = new Evaluator(this);
        this.startPolyProcess();
        this.jsffi = new PolyMLext.JSFFI(this);
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
        if (PolyMLext.prefs.PolyMLPath!="") {
            args.push(PolyMLext.prefs.PolyMLPath.value);
        }
        this.process = Utils.startProcess(bin, args, false);
    },
    
    stopPolyProcess : function() {
        var bin = Utils.getExtensionPath();
        bin.append("poly");
        bin.append("bin");
        bin.append("kill.sh");
        //check that the process is really there
        if (this.process) {
            var args = [this.process.pid];
            var process = Utils.startProcess(bin, args);
        }
    },

    destroy : function() {
        //PolyMLext.debug.writeProfilingReport();
        try {
            this.stopPolyProcess();
        } catch(e) {}
        try {
            this.socket1.destroy();
        } catch(e) {}
        try {
            this.socket2.destroy();
        } catch(e) {}
        try {
            this.jsffi.destroy();
        } catch(e) {}
        try {
            this.evaluator.destroy();
        } catch(e) {}
        try {
            this.sandbox.destroy();
        } catch(e) {}
    },

    onRequest : function(request) {
        var response = this.jsffi.process(request);
        
        //Figure out whether to use sendCode or sendResponse, by looking at the
        //response.ret. This is needed, because poly could have called recv2()
        //or recv()
        switch (response.type) {
            case "success":
                if (response.ret) {
                    this.sendResponse(response.message);
                }
                break;
            
            case "exception":
                if (response.ret) {
                    this.sendResponse(response.message, true);
                } else {
                    this.sendCode(response.message, true);
                }
                break;
        }
    },

    onReady : function() {
        this.setStatusDefault();
        this.evaluator.start();
        this.ready = true;
    },
    
    onConnectionLost : function() {
                log("Test1");
        this.setStatus({s:"PolyML process is gone", error:true});
    },
    
    //this is used for sending PolyML code to be evaluated
    //e.g. embedded code, console commands, event code
    sendCode : function(m, exception) {
        //The messages that are sent to poly have to
        // be preappended with "0" or "1" indicating succesful processing of the
        // request or an exception.
        var prefix = "0"
        if (exception) {
            prefix = "1";
        }
        this.socket1.send(prefix+m);
    },
    
    //this is used only for sending responses to Poly JS Wrappers requests
    sendResponse : function(m, exception) {
        //The messages that are sent to poly have to
        // be preappended with "0" or "1" indicating succesful processing of the
        // request or an exception.
        var prefix = "0"
        if (exception) {
            prefix = "1";
        }
        this.socket2.send(prefix+m);
    },
    
    setStatus : function(s) {
        this.status = s;
        PolyMLext.browserUI.setStatus(this);
    },
    
    setStatusDefault : function() {
        //if there was an error, we do not want to clear the status, the user
        //should be able to see the error
        if (!this.status.error) {
            this.setStatus({s:"PolyML"});
        }
    },
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
                    self.poly.setStatus({s:"Downloading... "+percentComplete+"%"});
                }
            }
            var destFile = this.poly.sandbox.getPath();
            destFile.append(filename);
            if (this.poly.document.baseURI) {
                var base = this.poly.document.baseURI;
            } else {
                var base = this.poly.document.documentURI;
            }
            Utils.downloadFile(src, base, destFile, listener);
            
            //add this 
            return { type:ext, filename:filename }
        }
        return null;
    },

    start : function() {
        var scripts = [];
        if (this.poly.document.contentType=="application/vnd.mozilla.xul+xml") {
            scripts = this.poly.document.getElementsByTagName("html:script");
        } else {
            scripts = this.poly.document.getElementsByTagName("script");
        }
        
        for (var i=0, len=scripts.length; i<len; i++) {
            if (scripts[i].getAttribute("type")=="application/x-polyml") {
                var src = scripts[i].getAttribute("src");
                if (src==null) {
                    //grab the code from the html
                    var code = scripts[i].innerHTML;
                    var p = {type:"code", code:code};
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
        this.poly.setStatus({s: "Compiling..."});
        for (var i in this.queue) {
            var p = this.queue[i];
            switch (p.type) {
                case "code":
                    var url = this.poly.document.location.href;
                    this.poly.sendCode("val _=PolyMLext.code_location:=\""+url+"\";");
                    this.poly.sendCode(p.code);
                    break;
                case "sml":
                    this.poly.sendCode('PolyMLext.use "' + p.filename + '";');
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
        this.poly.setStatusDefault();
    },
    
    /**
     * based on http://mxr.mozilla.org/mozilla-central/source/toolkit/components/viewsource/content/viewSource.js?raw=1
     */
    viewSource : function(url) {
        var viewSrcUrl = "view-source:" + url;
    
        var loadFromURL = true;
    
        /*
        var pageDescriptor = ?page descriptor?;
        //try loading it from cache first by using the descriptor
        try {
            var pageLoader = getWebNavigation().QueryInterface(Ci.nsIWebPageDescriptor);
            if (typeof(pageDescriptor) == "object" && pageDescriptor != null) {
                // Load the page using the page descriptor rather than the URL.
                // This allows the content to be fetched from the cache (if
                // possible) rather than the network...
                pageLoader.loadPage(pageDescriptor, gPageLoader.DISPLAY_AS_SOURCE);
                // The content was successfully loaded.
                loadFromURL = false;
            }
        } catch(ex) {
          // Ignore the failure. The content will be loaded via the URL instead
        }
        */
    
        if (loadFromURL) {
            // Currently, an exception is thrown if the URL load fails...
            var loadFlags = Ci.nsIWebNavigation.LOAD_FLAGS_NONE;
            getWebNavigation().loadURI(viewSrcUrl, loadFlags, null, null, null);
        }
    },
    
    destroy : function() {}
}

/*
 sandbox deals with the filesystem. it takes care of creating temporary
 disk space for downloaded PolyML applications
*/
PolyMLext.Sandbox = function() {
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
PolyMLext.Sandbox.prototype = {
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
    
    //completely empties the sandbox dir
    clean : function() {
        var sandboxPath = Utils.getExtensionPath();
        sandboxPath.append("sandboxes");
        Utils.removeDir(sandboxPath);
        Utils.createDir(sandboxPath);
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
var Socket1 = function(eventListener) {
    this.eventListener = eventListener;

    this.tm = Cc["@mozilla.org/thread-manager;1"].getService();
    this.socket = Cc["@mozilla.org/network/server-socket;1"].
            createInstance(Ci.nsIServerSocket);
    //args: port , loopbackOnly, aBackLog
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
        do {
            var bytesToWaitFor = 0;
            if (!this.reading) {
                try {
                    //TODO: also check here, if we really read as much as we
                    //wanted, because asyncWait does not guarantee that it will
                    //callback when PREFIX_SIZE of data is available
                    var r = this.sin.read(PolyMLext.PREFIX_SIZE);
                    if (r.length<PolyMLext.PREFIX_SIZE) {
                        throw "Didn't receive the full prefix.";
                    }
                } catch (e) {
                    error(e);
                    if (this.eventListener) {
                        this.eventListener.onConnectionLost();
                    }
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
                this.bytesLeft -= chunk.length;
                this.request += chunk;
                if (this.bytesLeft == 0) {
                    //we're done with reading this request
                    this.eventListener.onRequest(this.request);
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
        } while (this.sin.available() >= bytesToWaitFor);
        //wait for the next chunk or request
        this.input.asyncWait(this, 0, bytesToWaitFor, this.tm.mainThread);
    },

    onSocketAccepted : function(serverSocket, clientSocket) {
        this.input = clientSocket.openInputStream(0, 0, 0).
                QueryInterface(Ci.nsIAsyncInputStream);
        this.output = clientSocket.openOutputStream(
                Ci.nsITransport.OPEN_BLOCKING, 0, 0);
        this.sin = Cc["@mozilla.org/scriptableinputstream;1"]
                .createInstance(Ci.nsIScriptableInputStream);
        this.sin.init(this.input);
        //args: nsIInputStreamCallback, aFlags, aRequestedCount, nsIEventTarget 
        this.input.asyncWait(this,0,PolyMLext.PREFIX_SIZE,this.tm.mainThread);
        this.eventListener.onReady();
    },

    onStopListening : function() {
        if (this.eventListener) {
            this.eventListener.onConnectionLost();
        }
    },

    //can't call send before the socket was accepted
    send : function(data) {
        try {
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
        } catch (e) {
            if (this.eventListener) {
                this.eventListener.onConnectionLost();
            }
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
        this.eventListener = null;
    
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
        try {
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
        } catch (e) {
            this.eventListener.onConnectionLost();
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
        this.eventListener = null;
        
        if (this.output&&this.output.close) {
            this.output.close();
        }
        if (this.socket&&this.socket.close) {
            this.socket.close();
        }
    }
}

}());