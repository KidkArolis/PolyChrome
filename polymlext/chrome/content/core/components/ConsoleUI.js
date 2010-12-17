(function() {
    
var log = PolyMLext.log;
var error = PolyMLext.error;

//shortcut
var e = function(id) { return document.getElementById(id) }

PolyMLext.ConsoleUI = function() {
    var self = this;
    this.logarea = e("polymlext-console-logarea").contentDocument
        .getElementById("polymlext-console-logarea");
    this.input = e("polymlext-console-logarea").contentDocument
        .getElementById("polymlext-console-input");
        
    this.input.addEventListener("keydown", function(event) {
        self.handleKeyDown(event);
    }, false);
}
PolyMLext.ConsoleUI.prototype = {
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
                annotatedContent = '<div class="polymlext-console-item-input"><pre>'+item.m+'</pre></div>';
                break;
            case "output":
                annotatedContent = '<div class="polymlext-console-item-output"><pre>'+item.m+'</pre></div>';
                break;
            case "error":
                annotatedContent = '<div class="polymlext-console-item-error"><pre>'+item.m+'</pre></div>';
                break;
        }
        return annotatedContent;
    },
    
    scrollDown : function() {
        var iframe = e("polymlext-console-logarea");
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
        e("polymlext-button-stop").hidden = false;
        e("polymlext-button-start").hidden = true;
        e("polymlext-button-console-show").disabled = false;
    },
    
    //this is called when page not containing active instance of Poly is displayed
    off : function(console) {
        this.activeConsole = null;
        this.hide();
        this.clear();
        e("polymlext-button-stop").hidden = true;
        e("polymlext-button-start").hidden = false;
        e("polymlext-button-console-show").disabled = true;
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
        e("polymlext-console-box").collapsed = false;
        e("polymlext-console-splitter").collapsed = false;
        e("polymlext-button-console-show").hidden = true;
        e("polymlext-button-console-hide").hidden = false; 
        if (this.activeConsole!=null) {
            this.activeConsole.minimized = false;
            Application.prefs.setValue(
                "extensions.polymlext@ed.ac.uk.Console.minimizedOnStartup", false);
        }
    },
    
    hide : function() {
        e("polymlext-console-box").collapsed = true;
        e("polymlext-console-splitter").collapsed = true;
        e("polymlext-button-console-show").hidden = false;
        e("polymlext-button-console-hide").hidden = true;    
        if (this.activeConsole!=null) {
            this.activeConsole.minimized = true;
            Application.prefs.setValue(
                "extensions.polymlext@ed.ac.uk.Console.minimizedOnStartup", true);
        }
    },
    
    handleKeyDown : function(event) {
        switch (event.which) {
            case this.KEY_ENTER:
                if (event.shiftKey)
                    break;
                if (this.activeConsole.poly.ready) {
                    var command = this.input.value;
                    if (command!="") {
                        this.activeConsole.logInput(command);
                        this.activeConsole.poly.sendCode(command);
                    }
                    this.input.value = "";
                    event.preventDefault();
                }
                break;
            case this.KEY_UP:
                this.input.value = this.activeConsole.historyOlder();
                break;
            case this.KEY_DOWN:
                this.input.value = this.activeConsole.historyNewer();
                break;
        }
    }
};

}());