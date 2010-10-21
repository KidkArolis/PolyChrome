var debug;

var PolyMLext = (function() {
    var consoleUI;
    var polyPages = [];

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
                break;
            }
        }
    }

    var bindPageLoad = function() {
        var browser = document.getElementById("appcontent");
        if(browser) {
            browser.addEventListener("load", onPageLoad, true);
        }
    }

    var bindContextMenu = function() {
        
        
        var demosLink = Utils.getExtensionPath();
        demosLink += '/chrome/content/demos';
        document.getElementById("polymlext-demos-button")
            .addEventListener("click", function() {
            gBrowser.selectedTab = gBrowser.addTab(demosLink);
        }, false);
        
        //The Construct (The Matrix reference :)
        var theConstructLink = Utils.getExtensionPath();
        theConstructLink += '/chrome/content/theConstruct.html';
        document.getElementById("polymlext-the-construct-button")
            .addEventListener("click", function() {
                gBrowser.selectedTab = gBrowser.addTab(theConstructLink);
            }, false);
    }

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
        var PolyMLLink = "http://polyml.org/"
        
        document.getElementById("polymlextConsoleButton")
                .setAttribute("hidden", true);
        document.getElementById("polymlextNoPolyButton")
                .setAttribute("hidden", false);
        document.getElementById("polymlextNoPolyButton")
                .addEventListener("click", function() {
                    alert("You have to install PolyML to use this extension.");
                    gBrowser.selectedTab = gBrowser.addTab(PolyMLLink);
                }, false)
    }

    var init = function () {
        Components.utils.import("resource://polymlext/Utils.jsm");
        debug = Cc["@ed.ac.uk/poly/debug-console;1"]
                .getService().wrappedJSObject;
        
        if (Utils.findPoly()) {
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
    }

    return {
        init: init
    }

}());

window.addEventListener("load", PolyMLext.init, false)

