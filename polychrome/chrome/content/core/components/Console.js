(function() {
    
var log = PolyChrome.log;
var error = PolyChrome.error;

PolyChrome.Console = function() {
    this.minimized = PolyChrome.prefs.consoleMinimizedOnStartup.value;
    //the first element in the history is always the currently typed in command
    this.cmdHistory = [""];
    this.content = [];
    this._historyResetPointer();
}
PolyChrome.Console.prototype = {
    poly : null, // poly object associated with this console
    minimized : true,
    content : null,
    cmdHistory : null,
    HISTORY_LIMIT : 200,
    historyPointer : null,
    
    log : function(m) {
        var message = {m:m, type:"output"};
        this.content.push(message);
        PolyChrome.browserUI.console.update(this, message);
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
        PolyChrome.browserUI.console.update(this, message);
        this.poly.setStatusDefault();
        this._historyAdd(m);
    },
    
    error : function(m) {
        var message = {m:m, type:"error"};
        this.content.push(message);
        PolyChrome.browserUI.console.update(this, message);
        this.poly.setStatus({s:"PolyML error", error:true});
    },
    
    
    _historyAdd : function(m) {
        this._historyResetPointer();
        if (m!=="" && (m!==this.historyOlder() || this.cmdHistory.length===1)) {
            this.cmdHistory[0] = m;
            this.cmdHistory.unshift("");
            if (this.cmdHistory.length > this.HISTORY_LIMIT) {
                this.cmdHistory.splice(this.cmdHistory.length-1,1);
            }
        } else {
            this.cmdHistory[0] = "";
        }
        this._historyResetPointer();
    },
    
    _historyResetPointer : function() {
        this.historyPointer = 0;
    },
    
    historyOlder : function() {
        if (this.historyPointer<this.cmdHistory.length-1) {
            this.historyPointer++;
        }
        return this.cmdHistory[this.historyPointer];
    },
    
    historyNewer : function() {
        if (this.historyPointer>0) {
            this.historyPointer--;
        }
        return this.cmdHistory[this.historyPointer];
    },
    
    historyUpdateCurrent : function(value) {
        this.cmdHistory[0] = value;
    },
    
    select : function() {
        PolyChrome.browserUI.console.select(this);
    },
    
    clear : function() {
        this.content = [];
        PolyChrome.browserUI.console.clear();
    },
    
    destroy : function() {}
};

}());