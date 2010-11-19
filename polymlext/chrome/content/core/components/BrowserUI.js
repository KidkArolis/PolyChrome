(function() {
    
var log = PolyMLext.log;
var error = PolyMLext.error;

//shortcut
var e = function(id) { return document.getElementById(id) }

PolyMLext.BrowserUI = function() {
    
    this.prefs = {};
    this.prefs.firstLaunch = Application.prefs
            .get("extensions.PolyMLext.firstLaunch");
    this.prefs.alwaysEnabled = Application.prefs
            .get("extensions.PolyMLext.alwaysEnabled");
    this.prefs.PolyMLPath = Application.prefs
            .get("extensions.PolyMLext.PolyMLPath");
    
    //checking if it's first time launch
    //which case an about page is displayed
    //var firstLaunch = Application.prefs.get("extensions.PolyMLext.firstLaunch");
    if (this.prefs.firstLaunch.value) {
        this.displayAboutPage();
        this.prefs.firstLaunch.value = false;
    }
    

    
    this.console = new ConsoleUI(this);
}
PolyMLext.BrowserUI.prototype = {
    activeConsole : null,
    callbacks : null,
    
    prefs : null,
    
    links : {
        about       : 'chrome://polymlext/content/about.html',
        demos       : 'chrome://polymlext/content/demos/index.html',
        construct   : 'chrome://polymlext/content/theConstruct.html'
    },
    
    noPoly : function() {
        var self = this;
        e("polymlext-button-console").setAttribute("hidden", true);
        e("polymlext-button-nopoly").setAttribute("hidden", false);
        e("polymlext-button-nopoly").addEventListener("click", function() {
                self.displayAboutPage();
            }, false);
    },
    
    bindContextMenu : function() {
        var self = this;
        
        //demos
        e("polymlext-button-demos").addEventListener("click", function() {
                self.displayDemosPage();
            }, false);
        
        //The Construct (The Matrix reference :)
        e("polymlext-button-construct").addEventListener("click", function() {
                gBrowser.selectedTab = gBrowser.addTab(self.links.construct);
            }, false);
        
        e("polymlext-button-alwaysEnable").setAttribute("checked",
                this.prefs.alwaysEnabled.value);
        this.prefs.alwaysEnabled.events.addListener("change", function(aEvent) {
            e("polymlext-button-alwaysEnable").setAttribute(
                    "checked", self.prefs.alwaysEnabled.value);
        });        
        e("polymlext-button-alwaysEnable").addEventListener("click",
            function() {
                self.prefs.alwaysEnabled.value =
                        !self.prefs.alwaysEnabled.value;
            }, false);
        
        
        //about
        e("polymlext-button-about").addEventListener("click", function() {
                self.displayAboutPage();
            }, false);
    },
    
    displayAboutPage : function() {
        Utils.openAndReuseOneTabPerURL(this.links.about);
    },
    
    displayDemosPage: function() {
        Utils.openAndReuseOneTabPerURL(this.links.demos);
    },
    
    yesPoly : function(callbacks) {        
        this.callbacks = callbacks;
        
        this.bindContextMenu();
        
        //bind the page load event
        var browser = e("appcontent");
        var self = this;
        if (browser) {
            browser.addEventListener("load", function(aEvent) {
                if (aEvent.originalTarget.nodeName == "#document") {
                    var doc = aEvent.originalTarget;
                    self.callbacks.onDocumentLoad(doc);
                }
            }, true);
        }
        //bind the tab select event
        gBrowser.tabContainer.addEventListener("TabClose",
                                               this.callbacks.onTabClose,
                                               false);
        
        //bind the tab select event
        gBrowser.tabContainer.addEventListener("TabSelect",
                                               this.callbacks.onTabSelect,
                                               false);
        
        //bind the tab move event
        gBrowser.tabContainer.addEventListener("TabMove",
                                               this.callbacks.onTabMove,
                                               false);
    },
    
    setStatus : function(s) {
        e("polymlext-icon-statusindicator").value = s.s;
        if (s.error) {
            e("polymlext-icon-statusindicator").style["color"] = "red";
        } else {
            e("polymlext-icon-statusindicator").style["color"] = "black";
        }
        
        //IMPROVE
        //this is fine for now, but once BrowserUI interactions start getting a
        //a bit more complex this should be refactored. Hardcoding the label
        //is not very good, also it's not very good to check the value of the
        //string as opposed to having some boolean variable for tracking the
        //enabled-to-click and enabled-already for each tab should
        if (PolyMLext.polyFound) {
            if (s.s=="Click to enable PolyML app") {
                //bind the click to load the app button
                e("polymlext-icon-statusindicator").addEventListener("click",
                    this.callbacks.onPolyEnable, false);
            } else {
                //remove the click to load the app button listener
                e("polymlext-icon-statusindicator").removeEventListener("click",
                    this.callbacks.onPolyEnable, false);
            }
        }
    }
};

var ConsoleUI = function(BrowserUI) {
    this.browser = BrowserUI;
    this.bindButtons();
    this.bindCommandLine();
}
ConsoleUI.prototype = {
    KEY_ENTER : 13,
    KEY_UP : 38,
    KEY_DOWN : 40,
    
    update : function(console) {
        if (this.activeConsole == console) {
            e("polymlext-console-logarea").value = this.activeConsole.content;
            this.scrollDown();
        }
    },
    
    select : function(console) {
        this.activeConsole = console;
        
        PolyMLext.BrowserUI.setStatus(this.activeConsole.status);
        e("polymlext-icon-statusindicator").setAttribute("hidden", false);
        e("polymlext-console-logarea").value = this.activeConsole.content;
        this.scrollDown();
        if (this.activeConsole.enabled) {
            if (this.activeConsole.poly.enabled) {
                if (this.activeConsole.minimized) {
                    this.hideConsole();
                } else {
                    this.showConsole();
                }
            this.setButtonColor("red");
            }
        } else {
            this.disable();
        }
    },
    
    scrollDown : function() {
        var textbox = e("polymlext-console-logarea");
        var ti = document.getAnonymousNodes(textbox)[0].childNodes[0];
        ti.scrollTop = ti.scrollHeight;
    },

    clearConsole : function() {
        e("polymlext-console-logarea").value = "";
    },
    
    toggleConsole : function(event) {
        if (this.activeConsole == null) {
            return;
        }
        if (!this.activeConsole.poly.enabled) {
            return;
        }
        if (event!=null && event.button!=0) {
            return;
        }
        if (this.activeConsole.minimized) {
            this.showConsole();
            Application.prefs.setValue(
                    "extensions.PolyMLext.Console.enabledOnStartup", true);
        } else {
            Application.prefs.setValue(
                "extensions.PolyMLext.Console.minimizedOnStartup", true);
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
    
    /*
    enable : function() {
        this.activeConsole.enabled = true;
        this.activeConsole.minimized = false;
        this.showConsole();
        this.setButtonColor("red");
    },
    */
    
    //this is called when a page containing no PolyML becomes active
    off : function(console) {
        if (console==undefined || this.activeConsole == console) {
            this.activeConsole = null;
            this.hideConsole();
            this.clearConsole();
            this.setButtonColor("gray");
            e("polymlext-icon-statusindicator").setAttribute("hidden", true);
        }
    },
    
    setButtonColor : function(c) {
        if (c=="gray") {
            e("polymlext-button-console").setAttribute("src",
                    "chrome://polymlext/skin/polyml_16x16_gray.png");
        } else {
            e("polymlext-button-console").setAttribute("src",
                    "chrome://polymlext/skin/polyml_16x16.png");
        }
    },
    
    showConsole : function() {
        e("polymlext-console-box").setAttribute("collapsed", false);
        e("polymlext-console-splitter").setAttribute("collapsed", false);
        Application.prefs.setValue(
                "extensions.PolyMLext.Console.minimizedOnStartup", false);
    },
    
    hideConsole : function() {
        e("polymlext-console-box").setAttribute("collapsed", true);
        e("polymlext-console-splitter").setAttribute("collapsed", true);
    },

    bindButtons : function() {
        var self = this;
        e("polymlext-button-console").addEventListener("click",
            function(event) {
                self.toggleConsole(event)
            }, false);
        e("polymlext-console-button-disable").addEventListener("click",
            function(event) {
                var LEFT_BUTTON = 0;
                if (event.button==LEFT_BUTTON) {
                    self.disable();
                    Application.prefs.setValue(
                        "extensions.PolyMLext.Console.enabledOnStartup", false);
                }
            }, false);
    },
    
    handleKeyDown : function(event) {
        //event.shiftKey
        switch (event.which) {
            case this.KEY_ENTER:
                var command = e("polymlext-console-commandline-input").value;
                e("polymlext-console-commandline-input").value = "";
                this.activeConsole.log("> " + command + "\n");
                this.activeConsole.historyAdd(command);
                this.activeConsole.poly.sendCode("0"+command);
                break;
            case this.KEY_UP:
                e("polymlext-console-commandline-input").value =
                        this.activeConsole.historyOlder();
                break;
            case this.KEY_DOWN:
                e("polymlext-console-commandline-input").value =
                        this.activeConsole.historyNewer();
                break;
        }
    },
    
    bindCommandLine : function() {
        var self = this;
        e("polymlext-console-commandline-input").addEventListener("keydown",
            function(event) { self.handleKeyDown(event) },
            false);
    },
    
    rebindCommandLine : function() {
        this.bindCommandLine();
    }
};

}());