(function() {
    
var log = PolyChrome.log;
var error = PolyChrome.error;

//shortcut
var e = function(id) { return document.getElementById(id) }

PolyChrome.BrowserUI = function(callbacks) {
    this.console = new PolyChrome.ConsoleUI();
    this.callbacks = callbacks;
    
    var self = this;
    
    e("polychrome-button-start").addEventListener("command", function(e) {
        PolyChrome.startPoly();
    }, false);
    e("polychrome-button-stop").addEventListener("command", function() {
        PolyChrome.stopPoly();
    }, false);
    e("polychrome-button-console-show").addEventListener("command", function() {
        self.console.show();
    }, false);
    e("polychrome-button-console-hide").addEventListener("command", function() {
        self.console.hide();
    }, false);    
    e("polychrome-button-alwaysEnable").setAttribute(
            "checked", PolyChrome.prefs.alwaysEnabled.value);
    PolyChrome.prefs.alwaysEnabled.events.addListener("change", function(aEvent) {
        e("polychrome-button-alwaysEnable").setAttribute(
                "checked", PolyChrome.prefs.alwaysEnabled.value);
    });        
    e("polychrome-button-alwaysEnable").addEventListener("command", function() {
        PolyChrome.prefs.alwaysEnabled.value =
            !PolyChrome.prefs.alwaysEnabled.value;
    }, false);
    e("polychrome-button-report-a-bug").addEventListener("command", function() {
        gBrowser.selectedTab = gBrowser.addTab(self.links.reportBugs);
    }, false);
    e("polychrome-button-demos").addEventListener("command", function() {
        self.displayDemosPage();
    }, false);    
    e("polychrome-button-docs").addEventListener("command", function() {
        gBrowser.selectedTab = gBrowser.addTab(self.links.docs);
    }, false);    
    e("polychrome-button-settings").addEventListener("command", function() {
        self.displaySettingsPage();
    }, false);
    
    //bind the page load event
    var browser = e("appcontent");
    browser.addEventListener("load", function(event) {
        if (event.originalTarget.nodeName == "#document") {
            var doc = event.originalTarget;
            self.callbacks.onDocumentLoad(doc);
            self.update();
        }
    }, true);
    //bind the tab select event
    gBrowser.tabContainer.addEventListener("TabClose", function(event) {
        var tab = event.target;
        if (tab.hasAttribute("polychrome-tabid")) {
            self.callbacks.onTabClose(tab.getAttribute("polychrome-tabid"));
            self.update();
        }
    }, false);
    //bind the tab select event
    gBrowser.tabContainer.addEventListener("TabSelect", function(event) {
        var tab = event.target;
        if (tab.hasAttribute("polychrome-tabid")) {
            self.callbacks.onTabSelect(tab.getAttribute("polychrome-tabid"));
        }
        self.update();
    }, false);
    //bind the tab move event
    gBrowser.tabContainer.addEventListener("TabMove", function(event) {
        var tab = event.target;
        if (tab.hasAttribute("polychrome-tabid")) {
            self.callbacks.onTabMove(tab.getAttribute("polychrome-tabid"));
        }
        self.update();
    }, false);
    
    e("polychrome-console-button-min").addEventListener("command", function(event) {
        self.console.hide();
    }, false);
    e("polychrome-icon").addEventListener("click", function(event) {
        if (event.button!=self.LEFT_MOUSE_BUTTON) return;
        if (PolyChrome.currentApp().active) {
            self.console.toggle();
        } else {
            if (content.document.defaultView.confirm(
                "Would you like to start a PolyML process for this page?")) {
                    PolyChrome.startPoly();
            }
        }
    }, false);
    
    e("polychrome-click-to-enable").addEventListener("click", function() {
        e("polychrome-click-to-enable").hidden = true;
        PolyChrome.startPoly();
    }, false);
    
    e("polychrome-icon-nopoly").addEventListener("click", function() {
        self.displaySettingsPage();
    }, false);
    
    this.update();
}
PolyChrome.BrowserUI.prototype = {
    LEFT_MOUSE_BUTTON : 0,
    callbacks : null,
    
    links : {
        settings    : 'chrome://polychrome/content/settings.html',
        demos       : 'chrome://polychrome/content/demos/index.html',
        docs        : 'chrome://polychrome/content/docs/docs.html',
        reportBugs  : 'https://github.com/KidkArolis/PolyChrome/issues'
    },
    
    displaySettingsPage : function() {
        Utils.openAndReuseOneTabPerURL(this.links.settings);
    },
    
    displayDemosPage: function() {
        Utils.openAndReuseOneTabPerURL(this.links.demos);
    },
    
    setIconGray : function() {
        e("polychrome-icon").src = "chrome://polychrome/skin/polyml_16x16_gray.png";
    },
    
    setIconRed : function() {
        e("polychrome-icon").src = "chrome://polychrome/skin/polyml_16x16.png";
    },
    
    setStatus : function(poly) {
        if (PolyChrome.currentApp().poly!=poly) {
            return;
        }
        e("polychrome-status").value = poly.status.s;
        if (poly.status.error) {
            e("polychrome-status").style["color"] = "red";
        } else {
            e("polychrome-status").style["color"] = "black";
        }
    },
    
    update : function() {
        var app = PolyChrome.currentApp();
        if (app==null) {
            return;
        }
        if (PolyChrome.polyFound || app.active) {
            var self = this;
            e("polychrome-icon").hidden = false;
            e("polychrome-icon-nopoly").hidden = true;
            if (app.active) {
                app.console.select();
                this.setStatus(app.poly);
                this.setIconRed();
                e("polychrome-button-stop").hidden = false;
                e("polychrome-button-start").hidden = true;
                e("polychrome-click-to-enable").hidden = true;
            } else {
                this.console.off();
                e("polychrome-status").value = "";
                this.setIconGray();
                e("polychrome-click-to-enable").hidden = !app.containsSML;
                e("polychrome-button-stop").hidden = true;
                e("polychrome-button-start").hidden = false;
                e("polychrome-button-console-show").disabled = true;
            }
        } else {
            this.console.off();
            e("polychrome-icon").hidden = true;
            e("polychrome-icon-nopoly").hidden = false;
            e("polychrome-status").value = "PolyML not found";
            e("polychrome-status").style["color"] = "black";
        }
    }
};

}());