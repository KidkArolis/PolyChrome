const Cc = Components.classes;
const Ci = Components.interfaces;
const Cr = Components.results;

const RUN_POLY_MANUALLY = true;

Poly.prototype = (function() {

    var console;
    
    var document;

    var process;
    
    var nativeJSON = Cc["@mozilla.org/dom/json;1"].createInstance(Ci.nsIJSON);

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
        if (RUN_POLY_MANUALLY) {
            console.log("Please start Poly module manually");
            return;
        }
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
    
        var dispatch = function(request) {
//            var document = window.content.document;
            try {
                request = nativeJSON.encode(request);
            } catch (e) {
                console.log("Could not decode JSON.", "error")
            }
            console.log("ABUGA"+request.type);
            /*
            switch (request.type) {
                //output
                case 1:
                    PolyMLext.Console.poly(request.output);
                    break;
                //code to evaluate
                case 2:
                    var response = null;
                    response = eval(request.code);
                    PolyMLext.Server.send(response);
                    break;
                //add event listener
                case 3:
                    console.log("Event listeners are not implemented");
                    break;
                default:
                    console.log("unexpected request from Poly", "error");
            }
            */
        }
    
    var processCode = function(doc, code) {
        document = doc;
        if (RUN_POLY_MANUALLY) {
            if (Server.ready()) {
                Server.send(code);
            } else {
//                console.log("I'll wait 10 seconds for you to launch Poly.");
                var timer = Components.classes["@mozilla.org/timer;1"]
                   .createInstance(Components.interfaces.nsITimer);
                timer.initWithCallback(
                    { notify: function() { processCode(document, code); } },
                    10000,
                    Components.interfaces.nsITimer.TYPE_ONE_SHOT
                );
            }
            return;
        }
        
        Server.send(code);
    }
    
    var evaluateScript = function () {
        var document = window.content.document;
        
        if (document.getElementById('code')!=null) {
            var code = document.getElementById('code').innerHTML;
            PolyMLext.Server.send(code);
        }
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
                    console.log('waiting for input');
                    while (sin.available()) {
                      request = request + sin.read(512);
                    }
                    console.log('Received: ' + request);
                    //perform the requested action
                    dispatch(request);
                    //wait for another request
                    input.asyncWait(reader,0,0,null);
                } catch (e) {
                    console.log('Poly was closed.', 'error');
                }
            } 
        }
        
        var listener = {
            onSocketAccepted: function(serverSocket, clientSocket) {
                console.log("Accepted connection on "+clientSocket.host+":"+clientSocket.port);
                input = clientSocket.openInputStream(0, 0, 0).QueryInterface(Ci.nsIAsyncInputStream);
                output = clientSocket.openOutputStream(Ci.nsITransport.OPEN_BLOCKING, 0, 0);
                input.asyncWait(reader,0,0,null);

//                input.close();
//                output.close();
            },
            onStopListening: function(serverSocket, status) {
                closeSocket();
            }
        }
        
        var destroy = function() {
            console.log("Closing the socket " + serverSocket.port + ".");
            serverSocket.close();
        }
        
        var ready = function() {
            return output!=null;
        }     
        
        var init = function () {
            serverSocket = Cc["@mozilla.org/network/server-socket;1"].
                    createInstance(Ci.nsIServerSocket);
            serverSocket.init(-1, true, 5);
            serverSocket.asyncListen(listener);
            console.log("Created a server socket on port " + serverSocket.port);//. serverSocket.port);
            
            //window.addEventListener("unload", cleanUp, false);
        }
        
        var port = function() {
            return serverSocket.port;
        }
        
        return {
            init : init,
            send : send,
            ready : ready,
            destroy : destroy,
            port : port
        }
    }();
    
    var destroy = function() {
        console.log("Destroying this instance of Poly.")
        Server.destroy();
        if (!RUN_POLY_MANUALLY) {
            process.kill();
        }
    }
    
    var init = function() {
        console = Cc["@ed.ac.uk/poly/console;1"].getService().wrappedJSObject;
        Server.init();
        startPoly();
    }

    return {
        init : init,
        Server : Server,
        processCode : processCode,
        destroy : destroy
    }
}())
    

// turning Poly Class into an XPCOM component
Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");
function Poly() {
    //IMPORTANT TO CALL THE init() METHOD
    this.init();
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
