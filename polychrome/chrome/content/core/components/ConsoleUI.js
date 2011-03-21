(function() {
    
var log = PolyChrome.log;
var error = PolyChrome.error;

//shortcut
var e = function(id) { return document.getElementById(id) }

PolyChrome.ConsoleUI = function() {
    var self = this;
    this.logarea = e("polychrome-console-logarea").contentDocument
        .getElementById("polychrome-console-logarea");
    
    //this.input = e("polychrome-console-commandline-input");
    
    this.input = e("polychrome-console-logarea").contentDocument
        .getElementById("polychrome-console-input-area");
    this.input.addEventListener("keydown", function(event) {
        self.handleKeyDown(event);
    }, false);
    //TODO this is to catch paste event and update the height of the textarea
    //there should be a separate function for doing this though.. that is we
    //don't have to do everything that's in handleKeyDown handler...
    this.input.addEventListener("input", function(event) {
        self.handleKeyDown(event);
    }, false);
    /*
    this.input = e("polychrome-console-logarea").contentDocument.defaultView.input;
    this.input.win.document.body.addEventListener("keydown", function(event) {
        log("keydown");
        self.handleKeyDown(event);
    }, false);
    */
    /*
    this.input.grabKeys(function(event) {
        self.handleKeyDown(event);
    }, function(event) {
        self.filterKeys(event);
    });
    */
    
}
PolyChrome.ConsoleUI.prototype = {
    KEY_ENTER : 13,
    KEY_UP : 38,
    KEY_DOWN : 40,
    KEY_TAB : 9,
    
    activeConsole : null,
    logarea : null,
    input : null,
    
    update : function(console, message) {
        if (this.activeConsole == console) {
            this.logarea.innerHTML += this.logItemToHtml(message);
            this.scrollDown();
        }
    },
    
    updateAll : function() {
        this.logarea.innerHTML = "";
        for (var i in this.activeConsole.content) {
            var item = this.activeConsole.content[i];
            this.logarea.innerHTML += this.logItemToHtml(item);
        }
        this.scrollDown();
    },
    
    logItemToHtml : function(item) {
        var annotatedContent = ""
        switch (item.type) {
            case "input":
                annotatedContent = '<div class="polychrome-console-item-input"><pre>'+item.m+'</pre></div>';
                break;
            case "output":
                annotatedContent = '<div class="polychrome-console-item-output"><pre>'+item.m+'</pre></div>';
                break;
            case "error":
                annotatedContent = '<div class="polychrome-console-item-error"><pre>'+item.m+'</pre></div>';
                break;
        }
        return annotatedContent;
    },
    
    scrollDown : function() {
        var iframe = e("polychrome-console-logarea");
        //wrappedJSObject
        iframe.contentDocument.defaultView.scrollTo(
                0, iframe.contentDocument.body.clientHeight);
    },

    clear : function() {
        this.logarea.innerHTML = "";
    },
    
    select : function(console) {
        this.activeConsole = console;
        this.updateAll();
        if (this.activeConsole.minimized) {
            this.hide();
        } else {
            this.show();
        }
        e("polychrome-button-console-show").disabled = false;
    },
    
    //this is called when page not containing active instance of Poly is displayed
    off : function(console) {
        this.activeConsole = null;
        this.hide();
        this.clear();
        e("polychrome-button-console-show").disabled = true;
    },
    
    toggle : function() {
        //differently from hide and show methods
        //toggle does not do anything if there is no active console
        if (this.activeConsole == null) {
            return;
        }
        if (this.activeConsole.minimized) {
            this.show();
        } else {
            this.hide();
        }
    },
    
    show : function(persistant) {
        e("polychrome-console-box").collapsed = false;
        e("polychrome-console-splitter").collapsed = false;
        e("polychrome-button-console-show").hidden = true;
        e("polychrome-button-console-hide").hidden = false; 
        if (this.activeConsole!=null) {
            this.activeConsole.minimized = false;
            Application.prefs.setValue(
                "extensions.polychrome@ed.ac.uk.Console.minimizedOnStartup", false);
        }
    },
    
    hide : function() {
        e("polychrome-console-box").collapsed = true;
        e("polychrome-console-splitter").collapsed = true;
        e("polychrome-button-console-show").hidden = false;
        e("polychrome-button-console-hide").hidden = true;    
        if (this.activeConsole!=null) {
            this.activeConsole.minimized = true;
            Application.prefs.setValue(
                "extensions.polychrome@ed.ac.uk.Console.minimizedOnStartup", true);
        }
    },
    
    _isCursorAtFirstLine : function(ta) {
        return ta.value.substr(0, ta.selectionStart).split("\n").length === 1;
    },
    
    _isCursorAtLastLine : function(ta) {
        var totalLines = ta.value.split("\n").length;
        var cursorLine = ta.value.substr(0, ta.selectionStart).split("\n").length;
        return totalLines === cursorLine;
    },
    
    handleKeyDown : function(event) {
        if (!this.activeConsole.poly.ready) {
            event.preventDefault();
            return;
        }
        
        var command = this.input.value;
        
        //TODO create a class for managing history...
        if (this.activeConsole.historyPointer === 0) {
            this.activeConsole.historyUpdateCurrent(command);
        }

        switch (event.which) {
            case this.KEY_ENTER:
                if (event.shiftKey) break;
                if (command!=="") {
                    this.activeConsole.logInput(command);
                    this.activeConsole.poly.sendCode(command);
                } else {
                    this.activeConsole.logInput(command);
                }
                this.input.value = "";
                event.preventDefault();
                break;
            
            case this.KEY_UP:
                if (this._isCursorAtFirstLine(this.input)) {
                    this.input.value = this.activeConsole.historyOlder();
                }
                break;
            
            case this.KEY_DOWN:
                if (this._isCursorAtLastLine(this.input)) {
                    this.input.value = this.activeConsole.historyNewer();
                }
                break;
        }
        
        //simple textarea resizing
        var rows = this.input.value.split('\n').length;
        this.input.rows = rows+1;
        
        this.scrollDown();
    },
};

}());