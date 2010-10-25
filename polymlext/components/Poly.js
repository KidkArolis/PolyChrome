const Cc = Components.classes;
const Ci = Components.interfaces;
const Cr = Components.results;

//global variable to be used by anyone in this component, it is initialized
//in the Poly.init()
var debug;

var counterReceived = 0;
var counterSent = 0;

var CHUNK_SIZE = 65536;
var PREFIX_SIZE = 9;

function Socket1(eventTarget, document) {
    this.init(eventTarget);
    this._document = document;
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
       
    onInputStreamReady : function(input) {
        if (!this.reading) {
            this.sin = Cc["@mozilla.org/scriptableinputstream;1"]
                .createInstance(Ci.nsIScriptableInputStream);
            this.sin.init(input);
            try {
                //TODO also check here, if we really read as much as we
                //wanted
                var r = this.sin.read(PREFIX_SIZE);
            } catch (e) {
                debug.error(e, this._document.location.href);
                return;
            }
            this.bytesLeft = parseInt(r);            
            this.bytesNextChunk = this.bytesLeft > CHUNK_SIZE ?
                                  CHUNK_SIZE : this.bytesLeft;
            this.request = "";
            this.reading = true;
            this.input.asyncWait(this,0,0,this.tm.mainThread);
        } else {
            try {
                var chunk = this.sin.read(this.bytesNextChunk);
            } catch (e) {
                debug.error(e, this._document.location.href);
                return;
            }
            this.request += chunk;
            this.bytesLeft -= chunk.length;
            if (this.bytesLeft == 0) {
                
                //dump("firefox <--- poly : " + ++counterReceived + "\n");
                //dump(this.request + "\n\n");
                
                //we're done with reading this request
                this.eventTarget.onRequest(this.request);
                //cleanup
                this.reading = false;
                this.request = "";
                //wait for the next request
                this.input.asyncWait(this,0,PREFIX_SIZE,this.tm.mainThread);
            } else {
                //there is more to read
                this.bytesNextChunk = this.bytesLeft > CHUNK_SIZE ?
                                      CHUNK_SIZE : this.bytesLeft;
                //wait for the next chunk
                this.input.asyncWait(this,0,0,this.tm.mainThread);
            }
        }
    },

    onSocketAccepted : function(serverSocket, clientSocket) {
        this.input = clientSocket.openInputStream(Ci.nsITransport.OPEN_BLOCKING, 0, 0).
                        QueryInterface(Ci.nsIAsyncInputStream);
        this.output = clientSocket.
                        openOutputStream(Ci.nsITransport.OPEN_BLOCKING, 0, 0);
        this.input.asyncWait(this,0,PREFIX_SIZE,this.tm.mainThread);
        this.eventTarget.onReady();
    },

    onStopListening : function() {},

    //can't call send before the socket was accepted
    send : function(data) {
        //dump("firefox ---> poly : " + ++counterSent + "\n");
        //var temp = data;
        //if (data=="") { temp = "-EMPTY STRING-"; }
        //dump(temp + "\n\n");
        
        var prefix = (data.length.toString() + Array(PREFIX_SIZE).join(" "))
                .substring(0, PREFIX_SIZE);
        var prefixed_data = prefix + data;
        var pos = 0;
        while (pos<prefixed_data.length) {
            var chunk = prefixed_data.substr(pos, CHUNK_SIZE);
            var nbytes = this.output.write(chunk, chunk.length);
            pos += nbytes;
        }
    },

    port : function() {
        return this.socket.port;
    },

    init : function(eventTarget) {
        this.input = null;
        this.output = null;
        //certain events will be fired on this target
        this.eventTarget = eventTarget;
        this.tm = Cc["@mozilla.org/thread-manager;1"].getService();
        this.socket = Cc["@mozilla.org/network/server-socket;1"].
                createInstance(Ci.nsIServerSocket);
        
        this.socket.init(-1, true, -1);
        debug.log(this.socket.port);
        this.socket.asyncListen(this);
    },

    destroy : function() {
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

function Socket2() {
    this.init();
}
Socket2.prototype = {
    //can't call send before the socket was accepted
     send : function(data) {        
        //dump("firefox ---> poly : " + ++counterSent + "\n");
        //var temp = data;
        //if (data=="") { temp = "-EMPTY STRING-"; }
        //dump(temp + "\n\n");
        
        var prefix = (data.length.toString() + Array(9).join(" "))
                .substring(0, 9);
        var prefixed_data = prefix + data;
        var pos = 0;
        while (pos<prefixed_data.length) {
            var chunk = prefixed_data.substr(pos, CHUNK_SIZE);
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

    init : function () {
        this.output = null;
        this.socket = Cc["@mozilla.org/network/server-socket;1"].
                createInstance(Ci.nsIServerSocket);
        this.socket.init(-1, true, -1);
        this.socket.asyncListen(this);
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

Poly.prototype = {
    startPoly : function () {        
        var binpath = Utils.getExtensionPath() + '/poly/bin/polyml';
        var args = [this.socket1.port(), this.socket2.port()];
        if (Utils.isDevelopmentMode()) {
            args.push("dev");
        }
        this.process = Utils.startProcess(binpath, args, false);
    },
    
    stopPoly : function() {
        var binpath = Utils.getExtensionPath() +
                '/poly/bin/stop_child_processes.sh';
        var args = [this.process.pid];
        var process = Utils.startProcess(binpath, args);
    },

    destroy : function() {
        //empty these callback functions, because there might still
        //be some events accumulated in firefox, that call these functions
        //after the sockets are closed
        this.socket1.onInputStreamReady = function() {};
        this.socket2.onInputStreamReady = function() {};
        
        this.stopPoly();
        this.socket1.destroy();
        this.socket2.destroy();
        this.console.destroy();
    },

    onRequest : function(request) {
        /*
         slightly obscure method. The messages that are sent to poly have to
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
        var scripts = this._document.getElementsByTagName("script");
        if (scripts==null) return;
        for (var i=0, len=scripts.length; i<len; i++) {
            if (scripts[i].getAttribute("type")=="application/x-polyml") {
                var code = scripts[i].innerHTML;
                this.socket1.send("0"+code);
            }
        }
    },

    init : function(doc, console) {
        Components.utils.import("resource://polymlext/Utils.jsm");
        this.process = null;
        this._document = doc;
        this.console = Cc["@ed.ac.uk/poly/console;1"]
                .createInstance().wrappedJSObject;
        this.console.init(this);
        debug = Cc["@ed.ac.uk/poly/debug-console;1"]
                .getService().wrappedJSObject;
        this.socket1 = new Socket1(this, doc);
        this.socket2 = new Socket2();
        this.startPoly();
        this.jswrapper = Cc["@ed.ac.uk/poly/jswrapper;1"].
                            createInstance().wrappedJSObject;
        this.jswrapper.init(this._document, this.socket1, this.console);
    }
}


// turning Poly Class into an XPCOM component
Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");
function Poly() {
    this.wrappedJSObject = this;
}
prototype2 = {
  classDescription: "Javascript XPCOM Component that communicates to PolyML",
  classID:          Components.ID("{29d11222-bb8e-41ee-a80d-909bdaf4620d}"),
  contractID:       "@ed.ac.uk/poly;1",
  QueryInterface: XPCOMUtils.generateQI(),
}
//add the required XPCOM glue into the Poly class
for (attr in prototype2) {
    Poly.prototype[attr] = prototype2[attr];
}
var components = [Poly];
function NSGetModule(compMgr, fileSpec) {
  return XPCOMUtils.generateModule(components);
}