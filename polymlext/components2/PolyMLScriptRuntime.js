//Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");
/*********************************************************** 
 aux
 ***********************************************************/
var log = function (aMessage) {
    var consoleService = Components.classes["@mozilla.org/consoleservice;1"].getService(Components.interfaces.nsIConsoleService);
    consoleService.logStringMessage("PolyMLext: " + aMessage);
}
/*********************************************************** 
 constants
 ***********************************************************/
// reference to the interface defined in nsIHelloWorld.idl  
const nsIScriptRuntime = Components.interfaces.nsIScriptRuntime;
// reference to the required base interface that all components must support  
const nsISupports = Components.interfaces.nsISupports;
const CLASS_ID = Components.ID("{ff5426b1-9b49-4445-b685-922cdaeed391}");
const CLASS_NAME = "Yupppi";
const CONTRACT_ID_NAME = "@mozilla.org/script-language;1?script-type=application/x-polyml";
const CONTRACT_ID_ID = "@mozilla.org/script-language;1?id=11";
/*********************************************************** 
 class definition
 ***********************************************************/
//class constructor  


function PolyMLScriptRuntime() {
    // If you only need to access your component from Javascript, uncomment the following line:  
    //this.wrappedJSObject = this;  
}
// class definition  
PolyMLScriptRuntime.prototype = {
    GetScriptTypeID: function () {
        log("wow11");
        alert('whatefak');
        return 11;
    }, ShutDown: function () {
        log("wow22");
    }, ParseVersion: function (aVersionStr) {
        log("wow33");
    }, CreateContext: function (ret) {
        log("wow44");
    }, DropScriptObject: function (object) {
        log("wow55");
    }, HoldScriptObject: function (object) {
        log("wow66");
    }, QueryInterface: function (aIID) {
        log("bow1" + aIID);
/*
    if (!aIID.equals(Components.interfaces.nsIScriptRuntime))// &&      
        //!aIID.equals(nsISupports))  
{
	log("bow777");
      throw Components.results.NS_ERROR_NO_INTERFACE;
}
*/
        log("bow2");
        return this;
    }
};
/*********************************************************** 
 class factory
 
 This object is a member of the global-scope Components.classes.
 It is keyed off of the contract ID. Eg:
 
 myHelloWorld = Components.classes["@dietrich.ganx4.com/helloworld;1"].
 createInstance(Components.interfaces.nsIHelloWorld); 
 
 ***********************************************************/
var PolyMLScriptRuntimeFactory = {
    createInstance: function (aOuter, aIID) {
        if (aOuter != null) throw Components.results.NS_ERROR_NO_AGGREGATION;
        return (new PolyMLScriptRuntime()).QueryInterface(aIID);
    }
};
/*********************************************************** 
 module definition (xpcom registration)
 ***********************************************************/
var PolyMLScriptRuntimeModule = {
    registerSelf: function (aCompMgr, aFileSpec, aLocation, aType) {
        aCompMgr = aCompMgr.
        QueryInterface(Components.interfaces.nsIComponentRegistrar);
        aCompMgr.registerFactoryLocation(CLASS_ID, CLASS_NAME, CONTRACT_ID_NAME, aFileSpec, aLocation, aType);
    }, unregisterSelf: function (aCompMgr, aLocation, aType) {
        aCompMgr = aCompMgr.
        QueryInterface(Components.interfaces.nsIComponentRegistrar);
        aCompMgr.unregisterFactoryLocation(CLASS_ID, aLocation);
    }, getClassObject: function (aCompMgr, aCID, aIID) {
        if (!aIID.equals(Components.interfaces.nsIFactory)) throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
        if (aCID.equals(CLASS_ID)) return PolyMLScriptRuntimeFactory;
        throw Components.results.NS_ERROR_NO_INTERFACE;
    }, canUnload: function (aCompMgr) {
        return true;
    }
};
/*********************************************************** 
 module initialization
 
 When the application registers the component, this function
 is called.
 ***********************************************************/

function NSGetModule(aCompMgr, aFileSpec) {
    return PolyMLScriptRuntimeModule;
}
