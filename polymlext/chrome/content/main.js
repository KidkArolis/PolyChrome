var debug = Cc["@ed.ac.uk/poly/debug-console;1"].getService().wrappedJSObject;
Cu.import("resource://polymlext/Utils.jsm");

var PolyMLext = (function() {
    var consoleUI;
    var polyPages = [];
    
    var links = {
        'about' : 'chrome://polymlext/content/about.html',
        'demos' : 'chrome://polymlext/content/demos',
        'construct' : 'chrome://polymlext/content/theConstruct.html'
    };

    var lookForPolyMLCode = function(doc) {
        var scripts = doc.getElementsByTagName("script");
        if (scripts==null) {
            return;
        }
        
        for (var i=0, len=scripts.length; i<len; i++) {
            if (scripts[i].getAttribute("type")=="application/x-polyml") {
                var poly = Cc["@ed.ac.uk/poly;1"]
                        .createInstance().wrappedJSObject;
                poly.init(doc);
                if (content.document==doc) {
                    poly.console.select();
                }                    
                polyPages.push({document: doc, poly:poly});
                //add event listener for page unload
                doc.defaultView.addEventListener("unload",
                                                 onPageUnload,
                                                 true);
                return;
            }
        }
    }

    var onPageLoad = function(aEvent) {
        if (aEvent.originalTarget.nodeName == "#document") {
            var doc = aEvent.originalTarget;
            if (isAboutPage(doc)) {
                processAboutPage(doc);
            }
            lookForPolyMLCode(doc);
        }
    }

    var onPageUnload = function(aEvent) {
        var doc = aEvent.originalTarget;
        for (var i=0, len=polyPages.length; i<len; ++i) {
            if (polyPages[i].document == doc) {
                polyPages[i].poly.destroy();
                polyPages[i].poly = null;
                polyPages.splice(i, 1);
                return;
            }
        }
    }

    var bindPageLoad = function() {
        var browser = document.getElementById("appcontent");
        if (browser) {
            browser.addEventListener("load", onPageLoad, true);
        }
    }

    var bindContextMenu = function() {
        //demos
        document.getElementById("polymlextDemosButton")
            .addEventListener("click", function() {
                Utils.openAndReuseOneTabPerURL(links.demos);
        }, false);
        
        //The Construct (The Matrix reference :)
        document.getElementById("polymlextTheConstructButton")
            .addEventListener("click", function() {
                gBrowser.selectedTab = gBrowser.addTab(links.construct);
            }, false);
        
        //about
        document.getElementById("polymlextAboutButton")
            .addEventListener("click", function() {
                displayAboutPage();
            }, false);
    }

    //for syncing the console to the page displayed
    var bindTabSelect = function() {
        gBrowser.tabContainer.addEventListener("TabSelect", function() {
            for (var i=0, len=polyPages.length; i<len; ++i) {
                if (polyPages[i].document == content.document) {
                    polyPages[i].poly.console.select();
                    return;
                }
            }
            consoleUI.off();
        }, false);
    }
    
    var showPolyNotFoundIcon = function() {
        document.getElementById("polymlextConsoleButton")
                .setAttribute("hidden", true);
        document.getElementById("polymlextNoPolyButton")
                .setAttribute("hidden", false);
        document.getElementById("polymlextNoPolyButton")
                .addEventListener("click", function() {
                    displayAboutPage();
                }, false)
    }
    
    var displayAboutPage = function() {
        /*gBrowser.selectedTab = gBrowser.addTab(aboutLink);*/
        Utils.openAndReuseOneTabPerURL(links.about);
    }
    
    var processAboutPage = function(doc) {
        if (!PolyMLext.polyFound) {
            doc.getElementById("polymlNotFound").style["display"] = "block";
        }
    }
    
    var isAboutPage = function(doc) {
        return doc.location.href==links.about;
    }

    var init = function () {
        PolyMLext.polyFound = Utils.findPoly();
        
        //if PolyML is found on the computer, initialize a bunch of stuff
        if (PolyMLext.polyFound) {
            consoleUI = Cc["@ed.ac.uk/poly/console-ui;1"]
                    .getService().wrappedJSObject;
            var browserUI = document;
            consoleUI.init(browserUI);
            
            bindPageLoad();
            bindTabSelect();
            bindContextMenu();
        } else {
            showPolyNotFoundIcon();
        }
        
        //checking if it's first time launch
        //which case an about page is displayed
        var prefService = Components
                .classes["@mozilla.org/preferences-service;1"]
                .getService(Ci.nsIPrefBranch)
        var firstLaunch = prefService.getBoolPref(
                "extensions.PolyMLext.FirstLaunch");
        if (firstLaunch) {
            displayAboutPage();
            var firstLaunch = prefService.setBoolPref(
                "extensions.PolyMLext.FirstLaunch", false);
        }
    }

    return {
        init: init
    }

}());

window.addEventListener("load", PolyMLext.init, false)

