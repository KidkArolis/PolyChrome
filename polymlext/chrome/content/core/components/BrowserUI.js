(function() {
    
var log = PolyMLext.log;
var error = PolyMLext.error;

//shortcut
var e = function(id) { return document.getElementById(id) }

PolyMLext.BrowserUI = function(callbacks) {
    this.console = new PolyMLext.ConsoleUI();
    this.callbacks = callbacks;
    
    var self = this;
    
    e("polymlext-button-start").addEventListener("click", function() {
        self.startPoly();
    }, false);
    e("polymlext-button-stop").addEventListener("click", function() {
        self.stopPoly();
    }, false);
    e("polymlext-button-console-show").addEventListener("click", function() {
        self.console.show();
    }, false);
    e("polymlext-button-console-hide").addEventListener("click", function() {
        self.console.hide();
    }, false);    
    e("polymlext-button-alwaysEnable").setAttribute(
            "checked", PolyMLext.prefs.alwaysEnabled.value);
    PolyMLext.prefs.alwaysEnabled.events.addListener("change", function(aEvent) {
        e("polymlext-button-alwaysEnable").setAttribute(
                "checked", PolyMLext.prefs.alwaysEnabled.value);
    });        
    e("polymlext-button-alwaysEnable").addEventListener("click", function() {
        PolyMLext.prefs.alwaysEnabled.value =
            !PolyMLext.prefs.alwaysEnabled.value;
    }, false);    
    e("polymlext-button-demos").addEventListener("click", function() {
        self.displayDemosPage();
    }, false);    
    e("polymlext-button-docs").addEventListener("click", function() {
        gBrowser.selectedTab = gBrowser.addTab(self.links.docs);
    }, false);    
    e("polymlext-button-settings").addEventListener("click", function() {
        self.displaySettingsPage();
    }, false);
    
    //bind the page load event
    var browser = e("appcontent");
    browser.addEventListener("load", function(event) {
        if (event.originalTarget.nodeName == "#document") {
            var doc = event.originalTarget;
            self.callbacks.onDocumentLoad(doc);
            //check if we should update the GUI
            if (content.document==doc) {
                self.update();
            }
        }
    }, true);
    //bind the tab select event
    gBrowser.tabContainer.addEventListener("TabClose", function(event) {
        var tab = event.target;
        if (tab.hasAttribute("polymlext-tabid")) {
            self.callbacks.onTabClose(tab.getAttribute("polymlext-tabid"));
        }
    }, false);
    //bind the tab select event
    gBrowser.tabContainer.addEventListener("TabSelect", function(event) {
        var tab = event.target;
        if (tab.hasAttribute("polymlext-tabid")) {
            self.callbacks.onTabSelect(tab.getAttribute("polymlext-tabid"));
        }
        self.update();
    }, false);
    //bind the tab move event
    gBrowser.tabContainer.addEventListener("TabMove", function(event) {
        var tab = event.target;
        if (tab.hasAttribute("polymlext-tabid")) {
            self.callbacks.onTabMove(tab.getAttribute("polymlext-tabid"));
        }
    }, false);
    
    
    e("polymlext-console-button-min").addEventListener("click", function(event) {
        //if (event.button==self.LEFT_MOUSE_BUTTON) {
            self.console.hide();
        //}
    }, false);
    e("polymlext-icon").addEventListener("click", function(event) {
        if (event.button!=self.LEFT_MOUSE_BUTTON) return;
        //here we slightly indirectly check if the app in the current tab is active
        if (self.currentApp().active) {
            self.console.toggle();
        } else {
            if (content.document.defaultView.confirm(
                "Would you like to start a PolyML process for this page?")) {
                    self.startPoly();
            }
        }
    }, false);
    
    e("polymlext-click-to-enable").addEventListener("click", function() {
        e("polymlext-click-to-enable").hidden = true;
        self.startPoly();
    }, false);
    
    e("polymlext-icon-nopoly").addEventListener("click", function() {
        self.displaySettingsPage();
    }, false);
    
    //observe changes to the custom polyml path option and modify the
    //UI accordingly
    PolyMLext.prefs.PolyMLPath.events.addListener("change", function(aEvent) {
        PolyMLext.findPoly();
        self.update();
        PolyMLext.removeHeaps();
    });
    
    this.update();
}
PolyMLext.BrowserUI.prototype = {
    LEFT_MOUSE_BUTTON : 0,
    callbacks : null,
    
    links : {
        settings    : 'chrome://polymlext/content/settings.html',
        demos       : 'chrome://polymlext/content/demos/index.html',
        docs        : 'chrome://polymlext/content/docs/docs.html'
    },
    
    displaySettingsPage : function() {
        Utils.openAndReuseOneTabPerURL(this.links.settings);
    },
    
    displayDemosPage: function() {
        Utils.openAndReuseOneTabPerURL(this.links.demos);
    },
    
    setIconGray : function() {
        e("polymlext-icon").src = "chrome://polymlext/skin/polyml_16x16_gray.png";
    },
    
    setIconRed : function() {
        e("polymlext-icon").src = "chrome://polymlext/skin/polyml_16x16.png";
    },
    
    currentAppId : function() {
        var tab = gBrowser.selectedTab;
        if (tab.hasAttribute("polymlext-tabid")) {
            var id = tab.getAttribute("polymlext-tabid");
            return id;
        } else {
            return null;
        }
    },
    
    currentApp : function() {
        var id = this.currentAppId();
        if (id!=null) {
            return PolyMLext.apps[id];
        } else {
            return null;
        }        
    },
    
    startPoly : function() {
        if (PolyMLext.polyFound) {
            var id = this.currentAppId();
            if (id!=null) {
                PolyMLext.startPoly(id);
                this.update();
            }
        }
    },
    
    stopPoly : function() {
        var id = this.currentAppId();
        if (id!=null) {
            PolyMLext.stopPoly(id);
            this.update();
        }
    },
    
    setStatus : function(poly) {
        if (this.currentApp().poly!=poly) {
            return;
        }
        e("polymlext-status").value = poly.status.s;
        if (poly.status.error) {
            e("polymlext-status").style["color"] = "red";
        } else {
            e("polymlext-status").style["color"] = "black";
        }
    },
    
    update : function() {
        var app = this.currentApp();
        if (app==null) {
            return;
        }
        if (PolyMLext.polyFound || app.active) {
            var self = this;
            e("polymlext-icon").hidden = false;
            e("polymlext-icon-nopoly").hidden = true;
            if (app.active) {
                app.console.select();
                this.setStatus(app.poly);
                this.setIconRed();                
                e("polymlext-button-stop").hidden = false;
                e("polymlext-button-start").hidden = true;
                e("polymlext-click-to-enable").hidden = true;
            } else {
                this.console.off();
                e("polymlext-status").value = "";
                this.setIconGray();
                e("polymlext-click-to-enable").hidden = !app.containsSML;
                e("polymlext-button-stop").hidden = true;
                e("polymlext-button-start").hidden = false;
                e("polymlext-button-console-show").disabled = true;
            }
        } else {
            this.console.off();
            e("polymlext-icon").hidden = true;
            e("polymlext-icon-nopoly").hidden = false;
            e("polymlext-status").value = "PolyML not found";
            e("polymlext-status").style["color"] = "black";
        }
    }
};

}());