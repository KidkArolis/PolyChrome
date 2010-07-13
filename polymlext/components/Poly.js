const Cc = Components.classes;
const Ci = Components.interfaces;
const Cr = Components.results;

var console = Cc["@ed.ac.uk/poly/console;1"].getService().wrappedJSObject;

function Server() {
    this.init();
}
Server.prototype = (function() {
    var input;
    var output;
    var serverSocket;

    var processRequest;

    var parent;

    //private and shared
    var tm = Cc["@mozilla.org/thread-manager;1"].getService();

    var onInputStreamReady = function(input) {
        try {
            var sin = Cc["@mozilla.org/scriptableinputstream;1"]
                        .createInstance(Ci.nsIScriptableInputStream);
            sin.init(input);
            sin.available();
            var request = '';
            while (sin.available()) {
              request += sin.read(512);
            }
            this.parent.processRequest(request);
            //wait for another request
            this.input.asyncWait(this,0,0,tm.mainThread);
        } catch (e) {
            console.log('Could not process the request. Reason: '+e, 'error');
        }
    }

    var onSocketAccepted = function(serverSocket, clientSocket) {
//        console.log("Accepted connection on "+clientSocket.host+":"+clientSocket.port);
        this.input = clientSocket.openInputStream(0, 0, 0).QueryInterface(Ci.nsIAsyncInputStream);
        this.output = clientSocket.openOutputStream(Ci.nsITransport.OPEN_BLOCKING, 0, 0);
        this.input.asyncWait(this,0,0,tm.mainThread);
    }
    var onStopListening = function() {}

    var send = function(data) {
        var n = this.output.write(data, data.length);
        console.log("Sent "+n+" bytes: " + data);
    }

    var destroy = function() {
//        console.log("Closing the socket " + this.serverSocket.port + ".");
        this.input.close();
        this.output.close();
        this.serverSocket.close();
    }

    var ready = function() {
        return this.output!=null;
    }

    var init = function () {
        this.serverSocket = Cc["@mozilla.org/network/server-socket;1"].
                createInstance(Ci.nsIServerSocket);
        this.serverSocket.init(-1, true, 5);
        this.serverSocket.asyncListen(this);
//        console.log("Created a server socket on port " + serverSocket.port);
    }

    var port = function() {
        return this.serverSocket.port;
    }

    return {
        //fields
        input : input,
        output : output,
        serverSocket : serverSocket,
        parent : parent,
        //methods
        init : init,
        send : send,
        ready : ready,
        destroy : destroy,
        port : port,
        onInputStreamReady : onInputStreamReady,
        onSocketAccepted : onSocketAccepted,
        onStopListening : onStopListening
    }
}())

Poly.prototype = (function() {

    //public
    var server;
    var process;
    var wrapper;
    var _document;
    var timer;

    var getProfilePath = function() {
        var fileLocator = Components.classes["@mozilla.org/file/directory_service;1"]
                .getService(Components.interfaces.nsIProperties);

        var path = escape(fileLocator.get("ProfD", Components.interfaces.nsIFile).path.replace(/\\/g, "/")) + "/";
        if (path.indexOf("/") != 0) {
            path = '/' + path;
        }
        return path;
    };

    var readFile = function(filename) {
	    var file = Cc["@mozilla.org/file/local;1"]
		    .createInstance(Ci.nsILocalFile);
	    file.initWithPath(filename);
	    if ( file.exists() == false ) {
		    console.log("File does not exist", "error");
	    }
	    var is = Cc["@mozilla.org/network/file-input-stream;1"]
		    .createInstance( Ci.nsIFileInputStream );
	    is.init( file,0x01, 00004, null);
	    var sis = Cc["@mozilla.org/scriptableinputstream;1"]
		    .createInstance( Ci.nsIScriptableInputStream );
	    sis.init( is );
	    var output = sis.read( sis.available() );
	    return output;
    }

    var startPoly = function (port) {
        //figure out the path of poly executable
        var binpath = readFile(getProfilePath()+'extensions/polymlext@ed.ac.uk');
        binpath = binpath.substring(0, binpath.length-1) + '/poly/PolyMLext';
        //run it
        var file = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsILocalFile);
        file.initWithPath(binpath);
        this.process = Cc["@mozilla.org/process/util;1"].createInstance(Ci.nsIProcess);
        this.process.init(file);
        var args = [port];
        this.process.run(false, args, args.length);
    }

    var processCode = function(doc, code) {
        this._document = doc;
        this.wrapper = Cc["@ed.ac.uk/poly/jswrapper;1"].
                        createInstance().wrappedJSObject;
        this.wrapper.init(this._document, this.server);

        if (this.server.ready()) {
            this.server.send(code);
        } else {
            this.timer = Components.classes["@mozilla.org/timer;1"]
                   .createInstance(Components.interfaces.nsITimer);
            var self = this;
            this.timer.initWithCallback(
            { notify: function() { self.processCode(self._document, code); } },
            5,
            Components.interfaces.nsITimer.TYPE_ONE_SHOT
            );
        }
    }

    var destroy = function() {
//        console.log("Destroying this instance of Poly.")
        this.timer.cancel();
        this.server.destroy();
        this.process.kill();
    }

    var processRequest = function(request) {
        console.log("Received request:\n" + request);
        var response = this.wrapper.process(request);
        if (response!="") {
            this.server.send(response);
        }
    }

    var init = function() {
        this.server = new Server();
        this.server.parent = this;
        this.startPoly(this.server.port());
    }

    return {
        //fields
        server : server,
        _document : _document,
        process : process,
        wrapper : wrapper,
        timer : timer,

        //methods
        init : init,
        startPoly : startPoly,
        processCode : processCode,
        processRequest : processRequest,
        destroy : destroy,
    }
}())


// turning Poly Class into an XPCOM component
Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");
function Poly() {
    this.wrappedJSObject = this;
    this.init();
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

