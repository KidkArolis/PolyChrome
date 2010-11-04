(function() {
    
var log = PolyMLext.log;
var error = PolyMLext.error;

PolyMLext.Console = function() {
    var prefService = Cc["@mozilla.org/preferences-service;1"]
            .getService(Ci.nsIPrefBranch)
    this.enabled = prefService.getBoolPref(
            "extensions.PolyMLext.Console.enabledOnStartup");
    this.minimized = !this.enabled;
    this.cmdHistory = [];
}
PolyMLext.Console.prototype = {
    poly : null, // poly object associated with this console
    minimized : true,
    enabled : false,
    content : "",    
    cmdHistory : null,
    HISTORY_LIMIT : 200,    
    historyPointer : -1,
    
    log : function(m) {
        if (this.enabled) {
            this.content += m;
            PolyMLext.BrowserUI.console.update(this);
        }
    },
    
    error : function(m) {
        this.content += m;
        PolyMLext.BrowserUI.console.update(this);
    },
    
    historyAdd : function(m) {
        this.historyResetPointer();
        if (m!="" && this.historyOlder() != m) {
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
        PolyMLext.BrowserUI.console.select(this);
    },
    
    destroy : function() {}
};

}());