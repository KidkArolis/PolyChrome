var PolyMLext = (function() {

	var log = function(aMessage) {
	  var consoleService = Components.classes["@mozilla.org/consoleservice;1"]
		                             .getService(Components.interfaces.nsIConsoleService);
	  consoleService.logStringMessage("PolyMLext: " + aMessage);
	}

	var runCppXPCOM = function() {
		try {
		    // normally Firefox extensions implicitly have XPCOM privileges, but since this is a file we have to request it.
		    // netscape.security.PrivilegeManager.enablePrivilege("UniversalXPConnect");
		    const cid = "@mozilla.org/polymlext/polymldom;1";
		    obj = Components.classes[cid].createInstance();
		    // bind the instance we just created to our interface
		    obj = obj.QueryInterface(Components.interfaces.IPolyMLDOM);
		} catch (err) {
		    alert(err);
		    return;
		}
		log("test2");
		var res = obj.Add(3, 4);
		log("3+4=" + res);
	}

	var runJsXPCOM = function() {
		try {  
//Components.classes['@ed.ac.uk/polymlext;1'].getService()
		    //netscape.security.PrivilegeManager.enablePrivilege("UniversalXPConnect");  
		    var myComponent = Components.classes['@ed.ac.uk/polymlext;1']
										//.getService().wrappedJSObject;
		                                .createInstance(Components.interfaces.nsIHelloWorld);
		    log(myComponent.hello());  
		} catch (anError) {  
			log("ERROR: " + anError);  
		} 
	}

	var init = function() {
		//runCppXPCOM();
		runJsXPCOM(); 
	}

	return {
		init : init	
	}
}());


setTimeout(PolyMLext.init, 1000);
