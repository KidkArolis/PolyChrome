const Cc = Components.classes;
const Ci = Components.interfaces;
const Cr = Components.results;

Poly.prototype = (function() {

    var console;

    var process;

    var getProfilePath = function() {
        var fileLocator =
            Components.classes["@mozilla.org/file/directory_service;1"]
                .getService(Components.interfaces.nsIProperties);
        
        var path = escape(fileLocator.get("ProfD", Components.interfaces.nsIFile).path.replace(/\\/g, "/")) + "/";
        if (path.indexOf("/") != 0) {
            path = '/' + path;
        }    
        return path;
    };

    function readFile(filename) {
	    var file = Cc["@mozilla.org/file/local;1"]
		    .createInstance(Ci.nsILocalFile);
	    file.initWithPath(filename);
	    if ( file.exists() == false ) {
		    console.log("File does not exist");
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
        var binpath = readFile(getProfilePath()+'/extensions/polymlext@ed.ac.uk');
        binpath = binpath.substring(0, binpath.length-1) + '/poly/poly';
        //run it
        var file = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsILocalFile);
        file.initWithPath(binpath);
        process = Cc["@mozilla.org/process/util;1"].createInstance(Ci.nsIProcess);
        process.init(file);
        // Run the process.
        // If first param is true, calling thread will be blocked until
        // called process terminates.
        // Second and third params are used to pass command-line arguments
        // to the process.
        var args = [];
        process.run(false, args, args.length);
    }

    var Server = function() {
    
        var input;
        var output;
        var serverSocket;
    
        var send = function(data) {
            var n = output.write(data, data.length);
            console.log("Sent "+n+" bytes.");
        }
        
        var reader = {
            onInputStreamReady : function(input) {
                try {
                    var sin = Cc["@mozilla.org/scriptableinputstream;1"]
                                .createInstance(Ci.nsIScriptableInputStream);
                    sin.init(input);
                    sin.available();
                    var request = '';
                    console.log('Waiting for input.');
                    while (sin.available()) {
                      request = request + sin.read(512);
                    }
                    console.log('Received: ' + request);
                    //perform the requested action
                    //PolyMLext.dispatch(request);
                    //wait for another request
                    input.asyncWait(reader,0,0,null);
                } catch (e) {
                    console.log('ERROR >>> Poly was closed.');
                }
            } 
        }
        
        var listener = {
            onSocketAccepted: function(serverSocket, clientSocket) {
                console.log("Accepted connection on "+clientSocket.host+":"+clientSocket.port);


                input = clientSocket.openInputStream(0, 0, 0).QueryInterface(Ci.nsIAsyncInputStream);
                output = clientSocket.openOutputStream(Ci.nsITransport.OPEN_BLOCKING, 0, 0);
                console.log('ping ping.');
                input.asyncWait(reader,0,0,null);
                console.log('pong pong.');

//                input.close();
//                output.close();
            },
            onStopListening: function(serverSocket, status) {
                closeSocket();
            }
        }
        
        var cleanUp = function() {
            console.log("Closing the socket.");
            serverSocket.close();
//            process.kill();
            PolyMLext.Console.close();
        }
        
        
        
        var init = function () {
            console = Cc["@ed.ac.uk/poly/console;1"].
                    getService().wrappedJSObject;
        
            serverSocket = Cc["@mozilla.org/network/server-socket;1"].
                    createInstance(Ci.nsIServerSocket);            
            try {
                serverSocket.init(9998, true, 5);
                serverSocket.asyncListen(listener);
                console.log("Listening on port 9998.");
            } catch (e) {
                console.log("The port is already in use.")
            }
            
            //window.addEventListener("unload", cleanUp, false);
        }
        
        return {
            init : init,
            send : send
        }
        
    }();

    return {
        Server : Server,
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
