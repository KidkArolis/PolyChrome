var nativeJSON = Cc["@mozilla.org/dom/json;1"].createInstance(Ci.nsIJSON);

/*helpers*/
var log = dump = function (aMessage) {
/*
        var consoleService = Cc["@mozilla.org/consoleservice;1"].
                                getService(Ci.nsIConsoleService);
        consoleService.logStringMessage("PolyMLext: " + aMessage);
*/
    PolyMLext.Console.log(aMessage);
}

/*
 *  Get the file path to the installation directory of this 
 *  extension.var doc = aEvent.originalTarget; // doc is document that triggered "onload" event  
    // do something with the loaded page.  
    // doc.location is a Location object (see below for a link).  
    // You can use it to make your code executed on certain pages only.  
    if(doc.location.href.search("forum") > -1)  
      alert("a forum page is loaded");  
      
    // add event listener for page unload   
    aEvent.originalTarget.defaultView.addEventListener("unload", function(){ myExtension.onPageUnload(); }, true);  
 */
 
var getExtensionPath = function(extensionName) {
    var chromeRegistry =
        Components.classes["@mozilla.org/chrome/chrome-registry;1"]
            .getService(Components.interfaces.nsIChromeRegistry);
            
    var uri =
        Components.classes["@mozilla.org/network/standard-url;1"]
            .createInstance(Components.interfaces.nsIURI);
    
    uri.spec = "chrome://" + extensionName + "/content/";
    
    var path = chromeRegistry.convertChromeURL(uri);
    if (typeof(path) == "object") {
        path = path.spec;
    }
    
    path = path.substring(0, path.indexOf("/chrome/") + 1);
    
    return path;
};
    
/*
 *  Retrieve the file path to the user's profile directory.
 *  We don't really use it here but it might come in handy
 *  for you.
 */
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
		log("File does not exist");
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

/*end helpers*/


var PolyMLext = (function ()
{

    var process;
    
    var listeners = [];

    var onPageLoad = function(aEvent) {
        if (!aEvent) { return; }
        if (aEvent.originalTarget.nodeName != "#document") {return;}
        var doc = aEvent.originalTarget;  
        //log("page loaded:" + doc.location.href);
        evaluateScript();
        // add event listener for page unload   
        //aEvent.originalTarget.defaultView.addEventListener("unload", 
            //function(){ PolyMLext.onPageUnload(); }, true);
    }
    
    var onPageUnload = function(aEvent) {
        if (aEvent.originalTarget.nodeName != "#document") {return;}
        if (aEvent.originalTarget instanceof HTMLDocument) {
            var doc = aEvent.originalTarget;
            log("Page unloaded:" + doc.location.href);
        }
    }
    
    var bindLoadUnload = function() {
        var appcontent = document.getElementById("appcontent");   // browser  
        if(appcontent) {
            appcontent.addEventListener("load", PolyMLext.onPageLoad, true);
        }
        //window.addEventListener("pagehide", PolyMLext.onPageUnload, false); 
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
    
    var dispatch = function(request) {
        var document = window.content.document;
        try {
            request = nativeJSON.encode(request);
        } catch (e) {
            log("ERROR >>> Could not decode JSON.")
        }
        log("ABUGA"+request.type);
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
                log("Event listeners are not implemented");
                break;
            default:
                log("ERROR >>> unexpected request from Poly");
        }
    }
    
    var Server = function() {
    
        var input;
        var output;
        var serverSocket;
    
        var send = function(data) {
            var n = output.write(data, data.length);
            log("Sent "+n+" bytes.");
        }
        
        var reader = {
            onInputStreamReady : function(input) {
                try {
                    var sin = Cc["@mozilla.org/scriptableinputstream;1"]
                                .createInstance(Ci.nsIScriptableInputStream);
                    sin.init(input);
                    sin.available();
                    var request = '';
                    log('Waiting for input.');
                    while (sin.available()) {
                      request = request + sin.read(512);
                    }
                    log('Received: ' + request);
                    //perform the requested action
                    //PolyMLext.dispatch(request);
                    //wait for another request
                    input.asyncWait(reader,0,0,null);
                } catch (e) {
                    log('ERROR >>> Poly was closed.');
                }
            } 
        }
        
        var listener = {
            onSocketAccepted: function(serverSocket, clientSocket) {
                log("Accepted connection on "+clientSocket.host+":"+clientSocket.port);


                input = clientSocket.openInputStream(0, 0, 0).QueryInterface(Ci.nsIAsyncInputStream);
                output = clientSocket.openOutputStream(Ci.nsITransport.OPEN_BLOCKING, 0, 0);
                log('ping ping.');
                input.asyncWait(reader,0,0,null);
                log('pong pong.');

//                input.close();
//                output.close();
            },
            onStopListening: function(serverSocket, status) {
                closeSocket();
            }
        }
        
        var cleanUp = function() {
            log("Closing the socket.");
            serverSocket.close();
//            process.kill();
            PolyMLext.Console.close();
        }
        
        
        
        var init = function () {
            serverSocket = Cc["@mozilla.org/network/server-socket;1"].
                    createInstance(Ci.nsIServerSocket);            
            try {
                serverSocket.init(9998, true, 5);
                serverSocket.asyncListen(listener);
                log("Listening on port 9998.");
            } catch (e) {
                log("The port is already in use.")
            }
            
            //window.addEventListener("unload", cleanUp, false);
        }
        
        return {
            init : init,
            send : send
        }
        
    }();
    
    var evaluateScript = function () {
        var document = window.content.document;
        
        if (document.getElementById('code')!=null) {
            var code = document.getElementById('code').innerHTML;
            PolyMLext.Server.send(code);
        }
    }
    
    var init = function () {
        bindLoadUnload();
        Server.init();
        //startPoly();
    }
    
    return {
        init: init,
        onPageLoad : onPageLoad,
        onPageUnload : onPageUnload,
        Server : Server,
        dispatch : dispatch
    }
    
}());

PolyMLext.Console = (function() {
    var win;
    
    var log = function(m) {
        win.document.getElementById('debug').value = win.document.getElementById('debug').value + m + "\n";
        win.focus();
    }
    
    var poly = function(m) {
        win.document.getElementById('polyml').value = win.document.getElementById('polyml').value + m + "\n";
        win.focus();
    }
    
    var close = function() {
        win.close();
    }

    var init = function() {
        win = window.open("chrome://polymlext/content/console.xul",
                  "console", "chrome,centerscreen, resizable=no");
        return win;
    }
    
    return {
        init: init,
        log : log,
        poly : poly,
    }
}());

window.onclose = PolyMLext.cleanUp;

//have to wait for the console to be loaded before we can proceed :-/
win = PolyMLext.Console.init();
win.onload = function() {
    PolyMLext.init();
};

