const Cc = Components.classes;
const Ci = Components.interfaces;
const Cr = Components.results;

var debug;

ConsoleUI.prototype = {
    prefService : null,
    browser : null,
    
    logArea : null,  
    onButton : false,
    offButton : false,
    
    activeConsole : null,
    
    update : function(console) {
        if (this.activeConsole == console) {
            this.logArea.value = this.activeConsole.content;
            this.scrollDown(this.logArea);
        }
    },
    
    select : function(console) {
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
            this.onDisable();
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
    
    onDisable : function(event) {
        if (this.activeConsole == null) {
            return;
        }
        if (event!=null && event.button!=0) {
            return;
        }
        
        this.activeConsole.enabled = false;
        this.activeConsole.minimized = true;
        this.activeConsole.content = "";

        this.hideConsole();
        this.setButtonColor("gray");
        this.clearConsole();
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
            self.onDisable(event)
        }, false);
    },
    
    bindCommandLine : function() {
        var self = this;
        this.commandLine.addEventListener("keypress", function(event) {
            if (event.which == 13) {
                var command = self.commandLine.value;
                self.commandLine.value = "";
                self.activeConsole.log("> " + command + "\n");
                self.activeConsole.poly.socket1.send(command);
            }
        }, false);
    },
    
    noPoly : function() {
        this.hideConsole();
        this.setButtonColor("gray");
        this.activeConsole = null;
    },
    
    init : function(b) {
        debug = Cc["@ed.ac.uk/poly/debug-console;1"].getService().wrappedJSObject;
        
        this.browser = b;
        this.logArea = this.browser
                .getElementById("polymlLogArea");
        this.consoleButton = this.browser
                .getElementById("polymlextConsoleButton");
        this.disableButton = this.browser
                .getElementById("polymlextConsoleDisableButton");
        this.commandLine = this.browser
                .getElementById("polymlextCommandLine");
        
        this.bindButtons();
        this.bindCommandLine();
    }
};

// turning Console Class into an XPCOM component
Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");
function ConsoleUI() {
    this.wrappedJSObject = this;
}
prototype2 = {
  classDescription: "A special Console for PolyML extension",
  classID: Components.ID("{057cd244-4025-43ac-9dd4-7fe2cd6a5d06}"),
  contractID: "@ed.ac.uk/poly/console-ui;1",
  QueryInterface: XPCOMUtils.generateQI(),
}
//add the required XPCOM glue into the Poly class
for (attr in prototype2) {
    ConsoleUI.prototype[attr] = prototype2[attr];
}
var components = [ConsoleUI];
function NSGetModule(compMgr, fileSpec) {
  return XPCOMUtils.generateModule(components);
}

