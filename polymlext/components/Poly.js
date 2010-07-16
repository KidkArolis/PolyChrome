const Cc = Components.classes;
const Ci = Components.interfaces;
const Cr = Components.results;

//global variable to be used by anyone in this component, it is initialized
//in the Poly.init()
var console;

function Socket1(eventTarget) {
    this.init(eventTarget);
}
Socket1.prototype = {
    onInputStreamReady : function(input) {
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
                this.eventTarget.onRequest(request);
            } catch (e) {
                console.log('Could not process the request. Reason: '+e, 'error');
            }
            this.input.asyncWait(this,0,0,this.tm.mainThread);
        } catch (e) {
            //TODO
            //the sockets have already been closed
            //but for some reason this throws exception on closing the page :-/
        }
    },

    onSocketAccepted : function(serverSocket, clientSocket) {
        console.log("Socket accepted on port "+serverSocket.port);
        this.input = clientSocket.openInputStream(0, 0, 0).
                        QueryInterface(Ci.nsIAsyncInputStream);
        this.output = clientSocket.
                        openOutputStream(Ci.nsITransport.OPEN_BLOCKING, 0, 0);
        this.input.asyncWait(this,0,0,this.tm.mainThread);
        this.eventTarget.onReady();
    },

    onStopListening : function() {},

    //can't call send before the socket was accepted
    send : function(data) {
        var nbytes = this.output.write(data, data.length);
//        console.log(data, "SENT");
    },

    port : function() {
        return this.socket.port;
    },

    init : function(eventTarget) {
        this.input = null;
        this.output = null;
        this.eventTarget = eventTarget;
        this.tm = Cc["@mozilla.org/thread-manager;1"].getService();
        this.socket = Cc["@mozilla.org/network/server-socket;1"].
                createInstance(Ci.nsIServerSocket);
        this.socket.init(-1, true, 5);
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
    //though here we could assume that by the time this is called
    //it is already accepted, because this socket is only used when
    //js function is executed, which means both sockets were already accepted
    send : function(data) {
        var nbytes = this.output.write(data, data.length);
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
        this.socket.init(-1, true, 5);
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
        //figure out the path of poly executable
        var binpath = readFile(getProfilePath()+'extensions/polymlext@ed.ac.uk');
        binpath = binpath.substring(0, binpath.length-1) + '/poly/PolyMLext';
        //run it
        var args = [this.socket1.port(), this.socket2.port()];
        this.process = startProcess(binpath, args);
    },

    destroy : function() {
        this.socket1.destroy();
        this.socket2.destroy();
        this.process.kill();
    },

    onRequest : function(request) {
        var response = this.jswrapper.process(request);
        if (response!="") {
            this.socket2.send(response);
        }
    },

    onReady : function() {
        var scripts = this._document.getElementsByTagName("script");
        if (scripts==null) return;
        for (var i=0, len=scripts.length; i<len; i++) {
            if (scripts[i].getAttribute("type")=="application/x-polyml") {
                var code = scripts[i].innerHTML;
                this.socket1.send(code);
            }
        }
    },

    init : function(doc) {
        Components.utils.import("resource://polymlext/utils.jsm");
        this.process = null;
        this._document = doc;
        console = Cc["@ed.ac.uk/poly/console;1"].getService().wrappedJSObject;
        this.socket1 = new Socket1(this);
        this.socket2 = new Socket2();
        this.startPoly();
        this.jswrapper = Cc["@ed.ac.uk/poly/jswrapper;1"].
                            createInstance().wrappedJSObject;
        this.jswrapper.init(this._document, this.socket1);
        this.jswrapper.instance = this.socket1.port();
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

