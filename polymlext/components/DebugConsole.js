const Cc = Components.classes;
const Ci = Components.interfaces;
const Cr = Components.results;

DebugConsole.prototype = (function() {
    return {
        consoleService : null,
        
        log : function(m, p) {
            prefix = p==null ? "INFO" : p;
            consoleService.logStringMessage(prefix + ": " + m + "\n");
        },
        
        error : function(m, source) {
            var scriptError = Components.classes["@mozilla.org/scripterror;1"]
                    .createInstance(Components.interfaces.nsIScriptError);
            var aSourceName = source;
            var aSourceLine = "";
            var aLineNumber = "";
            var aColumnNumber = "";
            var aFlags = 0x0;
            var aCategory = "";
            scriptError.init(m, aSourceName, aSourceLine, aLineNumber, 
                   aColumnNumber, aFlags, aCategory);
            consoleService.logMessage(scriptError);
        },
        
        init : function() {
            consoleService = Cc["@mozilla.org/consoleservice;1"]
                    .getService(Components.interfaces.nsIConsoleService);
        }
    };
}());

// turning Console Class into an XPCOM component
Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");
function DebugConsole() {
    this.wrappedJSObject = this;
    this.init();
}
prototype2 = {
  classDescription: "A wrapper for nsIConsoleService",
  classID: Components.ID("{35889d74-64c3-4d15-a578-b6aecb283928}"),
  contractID: "@ed.ac.uk/poly/debug-console;1",
  QueryInterface: XPCOMUtils.generateQI(),
}
//add the required XPCOM glue into the Poly class
for (attr in prototype2) {
    DebugConsole.prototype[attr] = prototype2[attr];
}
var components = [DebugConsole];
function NSGetModule(compMgr, fileSpec) {
    return XPCOMUtils.generateModule(components);
}

