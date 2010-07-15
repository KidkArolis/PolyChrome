const Cc = Components.classes;
const Ci = Components.interfaces;
const Cr = Components.results;

function Socket1() {
    this.init();
}
Socket1.prototype = (function() {
    var input;
    var output;
    var socket;
    var parent;
    var timer;
    var console; //private and shared
    var tm; //private and shared

    var onInputStreamReady = function(input) {
        try {
            var sin = Cc["@mozilla.org/scriptableinputstream;1"]
                        .createInstance(Ci.nsIScriptableInputStream);
            sin.init(input);
            sin.available();
            var len = parseInt(sin.read(10));
            var request = sin.read(len);
            //TODO: is smth with smaller chunks better?
            //while (sin.available()) { request += sin.read(512); }
            try {
                this.parent.processRequest(request);
            } catch (e) {
                console.log('Could not process the request. Reason: '+e, 'error');
            }
            this.input.asyncWait(this,0,0,tm.mainThread);
        } catch (e) {
            //TODO
            //the sockets have already been closed
            //but for some reason this throws exception on closing the page :-/
        }
    }

    var onSocketAccepted = function(serverSocket, clientSocket) {
        this.input = clientSocket.openInputStream(0, 0, 0).
                        QueryInterface(Ci.nsIAsyncInputStream);
        this.output = clientSocket.
                        openOutputStream(Ci.nsITransport.OPEN_BLOCKING, 0, 0);
        this.input.asyncWait(this,0,0,tm.mainThread);
    }

    var onStopListening = function() {}

    var send = function(data) {
        if (this.ready()) {
            var nbytes = this.output.write(data, data.length);
            //console.log(data, "SENT");
        } else {
            this.timer = Components.classes["@mozilla.org/timer;1"]
                   .createInstance(Components.interfaces.nsITimer);
            var self = this;
            this.timer.initWithCallback(
            { notify: function() { self.send(data); } },
            5,
            Components.interfaces.nsITimer.TYPE_ONE_SHOT);
        }
    }

    var destroy = function() {
        this.timer.cancel();
        this.input.close();
        this.output.close();
        this.socket.close();
    }

    var ready = function() {
        return this.output!=null;
    }

    var init = function () {
        console = Cc["@ed.ac.uk/poly/console;1"].getService().wrappedJSObject;
        tm = Cc["@mozilla.org/thread-manager;1"].getService();
        this.socket = Cc["@mozilla.org/network/server-socket;1"].
                createInstance(Ci.nsIServerSocket);
        this.socket.init(-1, true, 5);
        this.socket.asyncListen(this);
    }

    var port = function() {
        return this.socket.port;
    }

    return {
        //fields
        input : input,
        output : output,
        socket : socket,
        parent : parent,
        timer : timer,
        console : console,
        tm : tm,
        //methods
        init : init,
        send : send,
        ready : ready,
        destroy : destroy,
        onInputStreamReady : onInputStreamReady,
        onSocketAccepted : onSocketAccepted,
        onStopListening : onStopListening
    }
}())

function Socket2() {
    this.init();
}
Socket2.prototype = (function() {
    var output;
    var socket;
    var parent;
    var timer;
    var console; //private and shared

    var send = function(data) {
        if (this.ready()) {
            var nbytes = this.output.write(data, data.length);
            //console.log(data, "SENT");
        } else {
            this.timer = Components.classes["@mozilla.org/timer;1"]
                   .createInstance(Components.interfaces.nsITimer);
            var self = this;
            this.timer.initWithCallback(
            { notify: function() { self.send(data); } },
            5,
            Components.interfaces.nsITimer.TYPE_ONE_SHOT);
        }
    }

    var onSocketAccepted = function(serverSocket, clientSocket) {
        this.output = clientSocket.
                        openOutputStream(Ci.nsITransport.OPEN_BLOCKING, 0, 0);
    }

    var onStopListening = function() {}

    var destroy = function() {
        this.timer.cancel();
        this.socket.close();
        this.output.close();
    }

    var ready = function() {
        return this.output!=null;
    }

    var init = function () {
        console = Cc["@ed.ac.uk/poly/console;1"].getService().wrappedJSObject;
        this.socket = Cc["@mozilla.org/network/server-socket;1"].
                createInstance(Ci.nsIServerSocket);
        this.socket.init(-1, true, 5);
        this.socket.asyncListen(this);
    }

    var port = function() {
        return this.socket.port;
    }

    return {
        //fields
        output : output,
        socket : socket,
        timer : timer,
        console : console,
        //methods
        init : init,
        send : send,
        ready : ready,
        destroy : destroy,
        onSocketAccepted : onSocketAccepted,
        onStopListening : onStopListening
    }
}())

Poly.prototype = (function() {
    var socket1;
    var socket2;
    var process;
    var jswrapper;
    var _document;
    var console; //private and shared

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

    var startPoly = function () {
        //figure out the path of poly executable
        var binpath = readFile(getProfilePath()+'extensions/polymlext@ed.ac.uk');
        binpath = binpath.substring(0, binpath.length-1) + '/poly/PolyMLext';
        //run it
        var file = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsILocalFile);
        file.initWithPath(binpath);
        this.process = Cc["@mozilla.org/process/util;1"].createInstance(Ci.nsIProcess);
        this.process.init(file);
        var args = [this.socket1.socket.port, this.socket2.socket.port];
        this.process.run(false, args, args.length);
    }

    var destroy = function() {
//        console.log("Destroying this instance of Poly.")
        this.socket1.destroy();
        this.process.kill();
    }

    var processRequest = function(request) {
        console.log(request, "RECV");
        var response = this.jswrapper.process(request);
        if (response!="") {
            this.socket2.send(response);
        }
    }

    var sendCode = function(code) {
        this.socket1.send(code);
    }

    var init = function(doc) {
        this._document = doc;
        console = Cc["@ed.ac.uk/poly/console;1"].getService().wrappedJSObject;
        this.socket1 = new Socket1();
        this.socket1.parent = this; //needed for passing down requests
        this.socket2 = new Socket2();
        this.startPoly();
        this.jswrapper = Cc["@ed.ac.uk/poly/jswrapper;1"].
                            createInstance().wrappedJSObject;
        this.jswrapper.init(this._document, this.socket1);
    }

    return {
        //fields
        socket1 : socket1,
        socket2 : socket2,
        _document : _document,
        process : process,
        jswrapper : jswrapper,

        //methods
        init : init,
        startPoly : startPoly,
        processRequest : processRequest,
        destroy : destroy,
        sendCode : sendCode
    }
}())


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

