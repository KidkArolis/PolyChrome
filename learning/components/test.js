
var log = dump = function (aMessage) {
        var consoleService = Components.classes["@mozilla.org/consoleservice;1"].getService(Components.interfaces.nsIConsoleService);
        consoleService.logStringMessage("PolyMLext: " + aMessage);
    }
    

// constants
const nsISupportsPriority = Components.interfaces.nsISupportsPriority;
const nsISupports = Components.interfaces.nsISupports;
const CLASS_ID = Components.ID("{1C0E8D86-B661-40d0-AE3D-CA012FADF170}");
const CLASS_NAME = "My Supports Priority Component";
const CONTRACT_ID = "@mozillazine.org/example/priority;1";

//class constructor
function MyPriority() {
  this._priority = nsISupportsPriority.PRIORITY_LOWEST;
};

//class definition
MyPriority.prototype = {
  _priority: null,

  get priority() { return this._priority; },
  set priority(aValue) { this._priority = aValue; },

  adjustPriority: function(aDelta) {
    log('nu veikia..');
    this._priority += aDelta;
  },

  QueryInterface: function(aIID)
  {
    if (!aIID.equals(nsISupportsPriority) &&    
        !aIID.equals(nsISupports))
      throw Components.results.NS_ERROR_NO_INTERFACE;
    return this;
  }
};

//class factory
var MyPriorityFactory = {
  createInstance: function (aOuter, aIID)
  {
    if (aOuter != null)
      throw Components.results.NS_ERROR_NO_AGGREGATION;
    return (new MyPriority()).QueryInterface(aIID);
  }
};

//module definition (xpcom registration)
var MyPriorityModule = {
  _firstTime: true,
  registerSelf: function(aCompMgr, aFileSpec, aLocation, aType)
  {
    if (this._firstTime) {
      this._firstTime = false;
      throw Components.results.NS_ERROR_FACTORY_REGISTER_AGAIN;
    };
    aCompMgr = aCompMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    aCompMgr.registerFactoryLocation(CLASS_ID, CLASS_NAME, CONTRACT_ID, aFileSpec, aLocation, aType);
  },

  unregisterSelf: function(aCompMgr, aLocation, aType)
  {
    aCompMgr = aCompMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    aCompMgr.unregisterFactoryLocation(CLASS_ID, aLocation);        
  },
  
  getClassObject: function(aCompMgr, aCID, aIID)
  {
    if (!aIID.equals(Components.interfaces.nsIFactory))
      throw Components.results.NS_ERROR_NOT_IMPLEMENTED;

    if (aCID.equals(CLASS_ID))
      return MyPriorityFactory;

    throw Components.results.NS_ERROR_NO_INTERFACE;
  },

  canUnload: function(aCompMgr) { return true; }
};

//module initialization
function NSGetModule(aCompMgr, aFileSpec) { return MyPriorityModule; }

