const Cc = Components.classes;
const Ci = Components.interfaces;
const Cr = Components.results;

var debug;

Console.prototype = {
    consoleUI : null,
    
    minimized : true,
    enabled : false,
    
    content : "",
    
    cmdHistory : null,
    HISTORY_LIMIT : 200,    
    historyPointer : -1,
    
    log : function(m) {
        if (this.enabled) {
            this.content += m;
            this.consoleUI.update(this);
        }
    },
    
    historyAdd : function(m) {
        this.historyResetPointer();
        if (this.historyOlder() != m) {
            this.cmdHistory.unshift(m);
            if (this.cmdHistory.length > this.HISTORY_LIMIT) {
                this.cmdHistory.splice(this.cmdHistory.length-1,1);
            }
        }
        this.historyResetPointer();
    },
    
    historyResetPointer : function() {
        this.historyPointer = -1;
    },
    
    historyOlder : function() {
        if (this.historyPointer<this.cmdHistory.length-1) {
            this.historyPointer++;
        }
        if (this.historyPointer==-1) {
            return "";
        } else {
            return this.cmdHistory[this.historyPointer];
        }
    },
    
    historyNewer : function() {
        if (this.historyPointer>-1) {
            this.historyPointer--;
        }
        if (this.historyPointer==-1) {
            return "";
        } else {
            return this.cmdHistory[this.historyPointer];
        }
    },
    
    select : function() {
        this.consoleUI.select(this);
    },
    
    init : function(p) {
        this.poly = p;
        
        debug = debug = Cc["@ed.ac.uk/poly/debug-console;1"].getService().wrappedJSObject;
        
        this.consoleUI = Cc["@ed.ac.uk/poly/console-ui;1"]
                .getService().wrappedJSObject;
        this.prefService = Cc["@mozilla.org/preferences-service;1"]
                .getService(Ci.nsIPrefBranch)
        
        this.enabled = this.prefService.getBoolPref(
                "extensions.PolyMLext.Console.enabledOnStartup");
        this.minimized = !this.enabled;
        
        this.ran = Math.floor(Math.random()*100);
        debug.log(this.ran);
        
        this.cmdHistory = [];
    },
    
    destroy : function() {
        this.consoleUI.off(this);
    }
};

// turning Console Class into an XPCOM component
Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");
function Console() {
    this.wrappedJSObject = this;
}
prototype2 = {
  classDescription: "A special Console for PolyML extension",
  classID: Components.ID("{483aecbc-42e7-456e-b5b3-2197ea7e1fb4}"),
  contractID: "@ed.ac.uk/poly/console;1",
  QueryInterface: XPCOMUtils.generateQI(),
}
//add the required XPCOM glue into the Poly class
for (attr in prototype2) {
    Console.prototype[attr] = prototype2[attr];
}
var components = [Console];
function NSGetModule(compMgr, fileSpec) {
  return XPCOMUtils.generateModule(components);
}

