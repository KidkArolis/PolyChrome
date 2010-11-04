var PolyMLext = (function() {
    
    Cu.import("resource://polymlext/core/Utils.jsm");

    var log = function(m) { PolyMLext.log(m); }

    return {
        
        //constants
        CHUNK_SIZE : 65536,
        PREFIX_SIZE : 9,
        
        //debugging/logging facilities
        debug : null,
        log : function(m) { PolyMLext.debug.log(m); },
        error : function(m) { PolyMLext.debug.error(m); },
        
        //all access to UI of Firefox goes via BrowserUI object
        BrowserUI : null,
        
        //a flag indicating whether PolyML was found on the system
        polyFound : null,
        
        //storage of all the goodness that makes this work, the key is
        //a browser tab and the value is an object containing the console
        //and poly object for that tab
        polyCollection : {},
        
        ran : Math.floor(Math.random()*100),
        
        //====================================================================
        
        init : function() {
            PolyMLext.debug = new PolyMLext.DebugConsole();
            
            //cleanup the sandbox in case the browser was not closed properly
            //TODO this should be moved out to some other object
            Utils.removeDir(Utils.getExtensionPath()+"/sandboxes/");
            Utils.createDir(Utils.getExtensionPath()+"/sandboxes/");
            
            PolyMLext.BrowserUI = new PolyMLext.BrowserUI();
            
            //if PolyML is found on the computer, initialize a bunch of stuff
            PolyMLext.polyFound = Utils.findPoly();
            if (PolyMLext.polyFound) {
                PolyMLext.BrowserUI.yesPoly({
                    onDocumentLoad : PolyMLext.lookForPolyMLCode,
                    onTabSelect : PolyMLext.onTabSelect,
                    onTabClose : PolyMLext.onTabClose,
                    onTabMove : PolyMLext.onTabMove
                });
            } else {
                PolyMLext.BrowserUI.noPoly();
            }
        },
    
        lookForPolyMLCode : function(doc) {
            var scripts = doc.getElementsByTagName("script");
            if (scripts==null) { return; }
            for (var i=0, len=scripts.length; i<len; i++) {
                if (scripts[i].getAttribute("type")=="application/x-polyml") {
                    var tab = Utils.getTabForDocument(doc);
                    var id = "";
                    if (tab.hasAttribute("polymlext-tabid")) {                        
                        id = tab.getAttribute("polymlext-tabid");
                        var poly = new PolyMLext.Poly(
                                doc, PolyMLext.polyCollection[id].console);
                        PolyMLext.polyCollection[id].poly = poly;
                        PolyMLext.polyCollection[id].console.poly = poly;
                        if (doc == content.document) {
                            PolyMLext.polyCollection[id].console.select();
                        }
                    } else {                       
                        //create new id
                        while (true) {
                            id = Utils.randomString();
                            if (!(id in PolyMLext.polyCollection)) {
                                break;
                            }
                        }
                        tab.setAttribute("polymlext-tabid", id);
                        var console = new PolyMLext.Console();
                        if (doc == content.document) {
                            console.select();
                        }
                        var poly = new PolyMLext.Poly(doc, console);
                        console.poly = poly;
                        console.poly = poly;
                        PolyMLext.polyCollection[id] = {
                            poly:poly,
                            console:console
                        };
                    }
                    //add event listener for page unload
                    doc.defaultView.addEventListener(
                            "unload", PolyMLext.onDocumentUnload, true);
                    return;
                }
            }
        },
        
        onDocumentUnload : function(event) {
            var doc = event.originalTarget;
            var tab = Utils.getTabForDocument(doc);
            //check if the tab was closed
            if (tab!=false) {
                var id = tab.getAttribute("polymlext-tabid");
                PolyMLext.polyCollection[id].poly.destroy();
                PolyMLext.polyCollection[id].poly = null;
                PolyMLext.BrowserUI.console.off();
            }
        },
        
        onTabSelect : function(event) {
            var tab = event.target;
            if (tab.hasAttribute("polymlext-tabid")) {
                var id = tab.getAttribute("polymlext-tabid");
                PolyMLext.polyCollection[id].console.select();
                return;
            }
            PolyMLext.BrowserUI.console.off();
        },
        
        onTabClose : function(event) {
            var tab = event.target;
            if (tab.hasAttribute("polymlext-tabid")) {
                var id = tab.getAttribute("polymlext-tabid");
                PolyMLext.polyCollection[id].poly.destroy();
                PolyMLext.polyCollection[id].console.destroy();
                delete PolyMLext.polyCollection[id];
            }
        },
        
        onTabMove : function(event) {
            log(event.explicitOriginalTarget.getAttribute("polymlext-tabid"));
            var tab = event.target;
            //if the tab was moved to a new window it was recreated
            //and the original tab was destroyed
            if (!tab.hasAttribute("polymlext-tabid")) {
                var newWin = event.view;
                var doc = newWin.gBrowser.getBrowserForTab(tab).contentDocument;
                //log(doc.location.href); //THIS LOGS about:blank, which indicates it's not the right document here.. or perhaps I'm accessing this too early..
            }
            var browser = event.target.linkedBrowser;
            var doc = event.view.gBrowser.getBrowserForDocument(gBrowser.selectedBrowser.contentDocument).contentDocument;
            //log(doc.location.href);
            //log(event.view.gBrowser.getBrowserForDocument(event.view.gBrowser.selectedTab).contentDocument);
        }
    }
}())