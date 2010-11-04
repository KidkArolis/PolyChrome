function ConsoleUI(browser) {
    this.init(browser);
}
ConsoleUI.prototype = {
    
    KEY_ENTER : 13,
    KEY_UP : 38,
    KEY_DOWN : 40,
    
    activeConsole : null,
    
    update : function(console) {
        if (this.activeConsole == console) {
            this.logArea.value = this.activeConsole.content;
            this.scrollDown(this.logArea);
        }
    },
    
    select : function(console) {
        this.statusIndicator.setAttribute("hidden", false);
        this.activeConsole = console;
        this.logArea.value = this.activeConsole.content;
        this.scrollDown(this.logArea);
        if (this.activeConsole.enabled) {
            if (this.activeConsole.minimized) {
                this.hideConsole();
            } else {
                this.showConsole();
            }
            this.setButtonColor("red");
        } else {
            this.disable();
        }
    },
    
    scrollDown : function(textbox) {
        var ti = this.browser.getAnonymousNodes(textbox)[0].childNodes[0];
        ti.scrollTop = ti.scrollHeight;
    },

    clearConsole : function() {
        this.logArea.value = "";
    },
    
    toggleConsole : function(event) {
        if (this.activeConsole == null) {
            return;
        }
        if (event!=null && event.button!=0) {
            return;
        }
        if (this.activeConsole.minimized) {
            this.showConsole();
        } else {
            this.hideConsole();
        }
        this.activeConsole.enabled = true;
        this.setButtonColor("red");
        this.activeConsole.minimized = !this.activeConsole.minimized;
    },
     
    //this disables the console, but keeps the activeConsole reference if it
    //were to be enabled again
    disable : function() {
        this.activeConsole.enabled = false;
        this.activeConsole.minimized = true;
        this.activeConsole.content = "";
        this.hideConsole();
        this.setButtonColor("gray");
        this.clearConsole();
    },
    
    enable : function() {
        this.activeConsole.enabled = true;
        this.activeConsole.minimized = false;
        this.showConsole();
        this.setButtonColor("red");
    },
    
    //this is called when a page containing no PolyML becomes active
    off : function(console) {
        if (console==undefined || this.activeConsole == console) {
            this.activeConsole = null;
            this.hideConsole();
            this.clearConsole();
            this.setButtonColor("gray");
            this.statusIndicator.setAttribute("hidden", true);
        }
    },
    
    setButtonColor : function(c) {
        if (c=="gray") {
            this.consoleButton.setAttribute("src",
                    "chrome://polymlext/skin/polyml_16x16_gray.png");
        } else {
            this.consoleButton.setAttribute("src",
                    "chrome://polymlext/skin/polyml_16x16.png");
        }
    },
    
    showConsole : function() {
        this.browser.getElementById("polymlextConsoleContentBox").
            setAttribute("collapsed", false);
        this.browser.getElementById("polymlextConsoleContentSplitter").
            setAttribute("collapsed", false);
    },
    
    hideConsole : function() {
        this.browser.getElementById("polymlextConsoleContentBox").
            setAttribute("collapsed", true);
        this.browser.getElementById("polymlextConsoleContentSplitter").
            setAttribute("collapsed", true);
    },

    bindButtons : function(eb, sb) {
        var self = this;
        this.consoleButton.addEventListener("click", function(event) {
            self.toggleConsole(event)
        }, false);
        this.disableButton.addEventListener("click", function(event) {
            var LEFT_BUTTON = 0;
            if (event.button==LEFT_BUTTON) {
                self.disable();
            }
        }, false);
    },
    
    handleKeyDown : function(event) {
        //event.shiftKey
        switch (event.which) {
            case this.KEY_ENTER:
                var command = this.commandLine.value;
                this.commandLine.value = "";
                this.activeConsole.log("> " + command + "\n");
                this.activeConsole.historyAdd(command);
                this.activeConsole.poly.socket1.send("0"+command);
                break;
            case this.KEY_UP:
                this.commandLine.value = this.activeConsole.historyOlder();
                break;
            case this.KEY_DOWN:
                this.commandLine.value = this.activeConsole.historyNewer();
                break;
        }
    },
    
    bindCommandLine : function() {
        var self = this;
        this.commandLine.addEventListener("keydown",
            function(event) { self.handleKeyDown(event) },
            false);
    },
    
    rebindCommandLine : function() {
        this.bindCommandLine();
    },
    
    init : function(b) {      
        this.browser = b;
        this.logArea = this.browser
                .getElementById("polymlLogArea");
        this.consoleButton = this.browser
                .getElementById("polymlextConsoleButton");
        this.disableButton = this.browser
                .getElementById("polymlextConsoleDisableButton");
        this.commandLine = this.browser
                .getElementById("polymlextCommandLine");
        this.statusIndicator = this.browser
                .getElementById("polymlextStatusIndicator");
        
        this.bindButtons();
        this.bindCommandLine();
    }
};
