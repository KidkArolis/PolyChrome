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
        
        //hacky var, it only means that the PolyMLext.extension variable is set...
        ready : false,
        
        //====================================================================
        
        init : function() {
            PolyMLext.debug = new PolyMLext.DebugConsole();
            
            if(Application.extensions) {
                PolyMLext.extension = Application.extensions
                    .get('polymlext@ed.ac.uk');
                PolyMLext.ready = true;
            } else if (Application.getExtensions) {
                Application.getExtensions(function (extensions){
                    PolyMLext.extension = extensions.get('polymlext@ed.ac.uk');
                    PolyMLext.ready = true;
                });
            }
            
            PolyMLext.Sandbox.prototype.clean();
            PolyMLext.BrowserUI = new PolyMLext.BrowserUI();
            //if PolyML is found on the computer, initialize a bunch of stuff
            if (PolyMLext.findPoly()) {
                PolyMLext.BrowserUI.yesPoly({
                    onDocumentLoad : PolyMLext.lookForPolyMLCode,
                    onTabSelect : PolyMLext.onTabSelect,
                    onTabClose : PolyMLext.onTabClose,
                    onTabMove : PolyMLext.onTabMove,
                    onPolyEnable : PolyMLext.onPolyEnable
                });
            } else {
                PolyMLext.BrowserUI.noPoly();
            }
            
            //if PolyML path is modified, we need to restart the browser
            PolyMLext.BrowserUI.prefs.PolyMLPath.events.addListener("change",
                function(aEvent) {
                    if (PolyMLext.findPoly()) {
                        var c = window.confirm(
                                "You need to restart the browser to "
                                + "finish updating PolyML path.\n"
                                + "Do you wish to do it right now?")
                        if (c) {
                            Application.restart();
                        }
                    }
            });
        },

        onReady : function(callback) {
            var init = function () {
              if (!PolyMLext.ready) {
                setTimeout(init, 100);
              } else {
                callback();
              }
            }
            init();
        },
        
        findPoly : function() {
            if (PolyMLext.BrowserUI.prefs.PolyMLPath.value=="") {
                //otherwise look for the path using a script
                var binpath = Utils.getExtensionPath();
                binpath.append("poly");
                binpath.append("bin");
                binpath.append("findpoly.sh");
                var process = Utils.startProcess(binpath, [], true);
                PolyMLext.polyFound = (process.exitValue==0);
            } else {
                var path = PolyMLext.BrowserUI.prefs.PolyMLPath.value +
                            "/bin/poly";
                PolyMLext.polyFound = Utils.fileExists(path);
            }
            return PolyMLext.polyFound;
        },
    
        lookForPolyMLCode : function(doc) {
            if (doc.contentType=="application/vnd.mozilla.xul+xml") {
                var scripts = doc.getElementsByTagName("html:script");
            } else {
                var scripts = doc.getElementsByTagName("script");
            }
            
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
                        PolyMLext.polyCollection[id].console.clear();
                        //hack #181
                        poly.enabled = true;
                        if (doc == content.document) {
                            PolyMLext.polyCollection[id].console.select();
                        }
                        //the same tab means we ignore the
                        //"alwaysEnabled" preference
                        poly.init();
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
                        var poly = new PolyMLext.Poly(doc, console);
                        console.poly = poly;
                        PolyMLext.polyCollection[id] = {
                            poly:poly,
                            console:console
                        };
                        
                        //check if PolyML is enabled
                        var alwaysEnabled = Application.prefs.getValue(
                            "extensions.polymlext@ed.ac.uk.alwaysEnabled",
                            false);
                        //hack #181
                        if (alwaysEnabled) {
                            poly.enabled = true;
                        }
                        if (doc == content.document) {
                            console.select();
                        }
                        if (alwaysEnabled) {
                            poly.init();
                        }
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
        
        onPolyEnable : function(event) {
            var tab = gBrowser.selectedTab;
            var id = tab.getAttribute("polymlext-tabid");
            //hack #181
            PolyMLext.polyCollection[id].poly.enabled = true;
            PolyMLext.polyCollection[id].console.select();
            PolyMLext.polyCollection[id].poly.init();
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