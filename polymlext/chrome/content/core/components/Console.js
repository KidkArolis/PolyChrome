(function() {
    
var log = PolyMLext.log;
var error = PolyMLext.error;

PolyMLext.Console = function() {
    this.enabled = Application.prefs.getValue(
        "extensions.polymlext@ed.ac.uk.Console.enabledOnStartup", false);
    this.minimized = Application.prefs.getValue(
        "extensions.polymlext@ed.ac.uk.Console.minimizedOnStartup", true);
    this.cmdHistory = [];
    this.content = [];
    this.status = {s:"Click to enable PolyML app"}
}
PolyMLext.Console.prototype = {
    poly : null, // poly object associated with this console
    minimized : true,
    enabled : false,
    content : null,
    cmdHistory : null,
    HISTORY_LIMIT : 200,
    historyPointer : -1,
    status : null,
    
    log : function(m) {
        if (this.enabled) {
            this.content.push({m:m, type:"output"});
            PolyMLext.BrowserUI.console.update(this);
        }
        this.setStatusDefault();
    },
    
    logInput : function(m) {
        //if the user is typing something in the console, we unset the error
        //flag in the current status, so that the error status can be cleared
        //when this function is called it means that the user must already have
        //seen the error status and message and is acting up on it
        if (this.enabled) {
            this.status.error = false;
            this.content.push({m:m, type:"input"});
            PolyMLext.BrowserUI.console.update(this);
        }
        this.setStatusDefault();
    },
    
    error : function(m) {
        this.content.push({m:m, type:"error"});
        PolyMLext.BrowserUI.console.update(this);
        this.setStatus({s:"PolyML error", error:true});
    },
    
    setStatus : function(s) {
        this.status = s;
        PolyMLext.BrowserUI.setStatus(this);
    },
    
    setStatusDefault : function() {
        //if there was an error, we do not want to clear the status, the user
        //should be able to see the error
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
        this.content = [];
    },
    
    destroy : function() {},
};

}());