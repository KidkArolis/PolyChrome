const Cc = Components.classes;
const Ci = Components.interfaces;
const Cr = Components.results;

DebugConsole.prototype = (function() {
    return {
        consoleService : null,
        
        debug : function(m, l) {
            level = l==null ? "INFO" : l;
            consoleService.logStringMessage(level + ": " + m + "\n");
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

