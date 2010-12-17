(function() {
    
var log = PolyMLext.log;
var error = PolyMLext.error;

PolyMLext.Console = function() {
    this.minimized = PolyMLext.prefs.consoleMinimizedOnStartup.value;
    this.cmdHistory = [];
    this.content = [];
}
PolyMLext.Console.prototype = {
    poly : null, // poly object associated with this console
    minimized : true,
    content : null,
    cmdHistory : null,
    HISTORY_LIMIT : 200,
    historyPointer : -1,
    
    log : function(m) {
        var message = {m:m, type:"output"};
        this.content.push(message);
        PolyMLext.browserUI.console.update(this, message);
        this.poly.setStatusDefault();
    },
    
    logInput : function(m) {
        //if the user is typing something in the console, we unset the error
        //flag in the current status, so that the error status can be cleared
        //when this function is called it means that the user must already have
        //seen the error status and message and is acting up on it
        this.poly.status.error = false;
        var message = {m:m, type:"input"};
        this.content.push(message);
        PolyMLext.browserUI.console.update(this, message);
        this.poly.setStatusDefault();
        this.historyAdd(m);
    },
    
    error : function(m) {
        var message = {m:m, type:"error"};
        this.content.push(message);
        PolyMLext.browserUI.console.update(this, message);
        this.poly.setStatus({s:"PolyML error", error:true});
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
        PolyMLext.browserUI.console.select(this);
    },
    
    clear : function() {
        this.content = [];
        PolyMLext.browserUI.console.clear();
    },
    
    destroy : function() {}
};

}());