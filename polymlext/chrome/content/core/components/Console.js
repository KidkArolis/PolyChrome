(function() {
    
var log = PolyMLext.log;
var error = PolyMLext.error;

PolyMLext.Console = function() {
    this.enabled = Application.prefs.get(
            "extensions.PolyMLext.Console.enabledOnStartup").value;
    this.minimized = Application.prefs.get(
            "extensions.PolyMLext.Console.minimizedOnStartup").value;
    this.cmdHistory = [];
    this.status = {s:"Click to enable PolyML app"}
}
PolyMLext.Console.prototype = {
    poly : null, // poly object associated with this console
    minimized : true,
    enabled : false,
    content : "",
    cmdHistory : null,
    HISTORY_LIMIT : 200,
    historyPointer : -1,
    status : null,
    
    log : function(m) {
        if (this.enabled) {
            this.content += m;
            PolyMLext.BrowserUI.console.update(this);
        }
        this.setStatusDefault();
    },
    
    error : function(m) {
        this.content += m;
        PolyMLext.BrowserUI.console.update(this);
        this.setStatus({s:"PolyML error", error:true});
    },
    
    setStatus : function(s) {
        this.status = s;
        PolyMLext.BrowserUI.setStatus(this.status);
    },
    
    setStatusDefault : function() {
        if (!this.status.error) {
            this.setStatus({s:"PolyML app"});
        }
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
    
    clear : function() {
        this.content = "";
    },
    
    destroy : function() {},
};

}());