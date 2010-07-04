var nativeJSON = Cc["@mozilla.org/dom/json;1"].createInstance(Ci.nsIJSON);

/*helpers*/
var log = dump = function (aMessage) {
/*
        var consoleService = Cc["@mozilla.org/consoleservice;1"].
                                getService(Ci.nsIConsoleService);
        consoleService.logStringMessage("PolyMLext: " + aMessage);
*/
    //PolyMLext.Console.log(aMessage);
    dump(aMessage);
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
 /*
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
 /*
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
    
    var evaluateScript = function () {
        var document = window.content.document;
        
        if (document.getElementById('code')!=null) {
            var code = document.getElementById('code').innerHTML;
            PolyMLext.Server.send(code);
        }
    }
    
    var init = function () {
        bindLoadUnload();
//        Server.init();
//        startPoly();
        poly = Cc["@ed.ac.uk/poly;1"].createInstance().wrappedJSObject;
        poly.Server.init();
    }
    
    return {
        init: init,
        onPageLoad : onPageLoad,
        onPageUnload : onPageUnload,
        dispatch : dispatch
    }
    
}());

/*
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
*/

//window.onclose = PolyMLext.cleanUp;

PolyMLext.init();

