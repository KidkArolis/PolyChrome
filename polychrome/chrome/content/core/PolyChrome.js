var PolyChrome = (function() {
    
    Cu.import("resource://polychrome/core/Utils.jsm");

    var log = function(m) { PolyChrome.log(m); }

    return {
        //constants
        CHUNK_SIZE : 65536,
        PREFIX_SIZE : 9,
        
        //debugging/logging facilities
        debug : null,
        log : function(m) { PolyChrome.debug.log(m); },
        error : function(m) { PolyChrome.debug.error(m); },
        
        //all access to UI of Firefox goes via browserUI object
        browserUI : null,
        
        //a flag indicating whether PolyML was found on the system
        polyFound : null,
        
        //we'll store shortcuts to relevant preferences here
        prefs : {},
        
        //storage of all the goodness that makes this work, the key is
        //a browser tab and the value is an object containing the console
        //and poly object for that tab
        apps : {},
        
        
        //======================================================================
        
        init : function() {
            PolyChrome.debug = new PolyChrome.DebugConsole();
            
            PolyChrome.prefs.alwaysEnabled = Application.prefs.get(
                "extensions.polychrome@ed.ac.uk.alwaysEnabled");
            PolyChrome.prefs.PolyMLPath = Application.prefs.get(
                "extensions.polychrome@ed.ac.uk.PolyMLPath");
            PolyChrome.prefs.consoleMinimizedOnStartup = Application.prefs.get(
                "extensions.polychrome@ed.ac.uk.Console.minimizedOnStartup");
            
            PolyChrome.findPoly();
            
            PolyChrome.Sandbox.prototype.clear();
            
            PolyChrome.browserUI = new PolyChrome.BrowserUI({
                onDocumentLoad : PolyChrome.processDoc,
                onTabSelect : PolyChrome.onTabSelect,
                onTabClose : PolyChrome.onTabClose,
                onTabMove : PolyChrome.onTabMove
            });
            
            //observe changes to the custom polyml path option
            PolyChrome.prefs.PolyMLPath.events.addListener("change", function() {
                PolyChrome.findPoly();
                PolyChrome.browserUI.update();
                PolyChrome.removeHeaps();
            });
        },
        
        processDoc : function(doc) {
            var tab = Utils.getTabForDocument(doc);
            
            //if this tab is fishy (not your regular tab),
            //don't create poly for it
            //TODO: explore when this happens...
            if (!tab || !tab.hasAttribute) return;
            
            var containsSML = PolyChrome.containsSML(doc);
            
            //check if the tab is being reused
            if (tab.hasAttribute("polychrome-tabid")) {
                var id = tab.getAttribute("polychrome-tabid");
                PolyChrome.apps[id].doc = doc;
                PolyChrome.apps[id].active =
                    (PolyChrome.apps[id].active && containsSML)
                    || (PolyChrome.polyFound
                        && PolyChrome.prefs.alwaysEnabled.value
                        && containsSML);
                PolyChrome.apps[id].containsSML = containsSML;
            } else {
                var id = PolyChrome.generateId();
                tab.setAttribute("polychrome-tabid", id);
                PolyChrome.apps[id] = {
                    doc : doc,
                    active : PolyChrome.polyFound
                        && PolyChrome.prefs.alwaysEnabled.value
                        && containsSML,
                    containsSML : containsSML,
                    console : new PolyChrome.Console(),
                    poly : null
                };
            }
            
            //should we start the PolyML process?
            if (PolyChrome.apps[id].active) {
                PolyChrome.startPoly(id);
            }
            
            //add event listener for page unload
            doc.defaultView.addEventListener(
                    "unload", PolyChrome.onDocumentUnload, true);
        },
        
        onDocumentUnload : function(event) {
            var doc = event.originalTarget;
            var tab = Utils.getTabForDocument(doc);
            //if tab was closed we don't do anything
            //as this will be handled by the onTabClose handler
            if (tab!=false) {
                var id = tab.getAttribute("polychrome-tabid");
                var c = PolyChrome.apps[id];
                if (c.poly != null) {
                    c.poly.destroy();
                    c.poly = null;
                }
                c.console.clear();
            }
        },
        
        onTabSelect : function(id) {
            
        },
        
        onTabClose : function(id) {
            var app = PolyChrome.apps[id];
            if (app.poly != null) {
                app.poly.destroy();
            }
            app.console.destroy();
            delete PolyChrome.apps[id];
        },
        
        onTabMove : function(event) {
            /*
            log(event.explicitOriginalTarget.getAttribute("polychrome-tabid"));
            var tab = event.target;
            //if the tab was moved to a new window it was recreated
            //and the original tab was destroyed
            if (!tab.hasAttribute("polychrome-tabid")) {
                var newWin = event.view;
                var doc = newWin.gBrowser.getBrowserForTab(tab).contentDocument;
                //log(doc.location.href); //THIS LOGS about:blank, which indicates it's not the right document here.. or perhaps I'm accessing this too early..
            }
            var browser = event.target.linkedBrowser;
            var doc = event.view.gBrowser.getBrowserForDocument(gBrowser.selectedBrowser.contentDocument).contentDocument;
            //log(doc.location.href);
            //log(event.view.gBrowser.getBrowserForDocument(event.view.gBrowser.selectedTab).contentDocument);
            */
        },
        
        startPoly : function(id) {
            if (!PolyChrome.polyFound) {
                return;
            }
            if (id==undefined) {
                id = PolyChrome.currentAppId();
                if (id==null) {
                    return;
                }
            }
            
            var app = PolyChrome.apps[id];
            app.poly = new PolyChrome.Poly(app.doc, app.console);
            app.console.poly = app.poly;
            app.console.minimized = this.prefs.consoleMinimizedOnStartup.value;
            app.active = true;
            app.poly.init();
            
            //check if we should update the GUI
            if (content.document==app.doc) {
                PolyChrome.browserUI.update();
            }
        },
        
        stopPoly : function(id) {
            if (id==undefined) {
                id = PolyChrome.currentAppId();
                if (id==null) {
                    return;
                }
            }
            
            var app = PolyChrome.apps[id];
            app.active = false;
            if (app.poly != null) {
                app.poly.destroy();
                app.poly = null;
            }
            
            //check if we should update the GUI
            if (content.document==app.doc) {
                PolyChrome.browserUI.update();
            }
        },        
        
        findPoly : function() {
            if (PolyChrome.prefs.PolyMLPath.value=="") {
                //otherwise look for the path using a script
                var binpath = Utils.getExtensionPath();
                binpath.append("poly");
                binpath.append("bin");
                binpath.append("findpoly.sh");
                var process = Utils.startProcess(binpath, [], true);
                PolyChrome.polyFound = (process.exitValue==0);
            } else {
                var path = PolyChrome.prefs.PolyMLPath.value + "/bin/poly";
                PolyChrome.polyFound = Utils.fileExists(path);
            }
            return PolyChrome.polyFound;
        },
        
        removeHeaps : function() {
            var isaplib_heap = Utils.getExtensionPath();
            isaplib_heap.append("poly");
            isaplib_heap.append("isaplib");
            isaplib_heap.append("heaps");
            isaplib_heap.append("all.polyml-heap");
            if (isaplib_heap.exists()) {
                isaplib_heap.remove(true);
            }
            
            var polyext_heap = Utils.getExtensionPath();
            polyext_heap.append("poly");
            polyext_heap.append("bin");
            polyext_heap.append("polychrome.polyml-heap");
            if (polyext_heap.exists()) {
                polyext_heap.remove(true);
            }
        },
        
        containsSML : function(doc) {
            if (doc.contentType=="application/vnd.mozilla.xul+xml") {
                var scripts = doc.getElementsByTagName("html:script");
            } else {
                var scripts = doc.getElementsByTagName("script");
            }
            if (scripts==null) {
                return false;
            }
            for (var i=0, len=scripts.length; i<len; i++) {
                if (scripts[i].getAttribute("type")=="application/x-polyml") {
                    return true;
                }
            }
            return false;
        },
        
        currentAppId : function() {
            var tab = gBrowser.selectedTab;
            if (tab.hasAttribute("polychrome-tabid")) {
                var id = tab.getAttribute("polychrome-tabid");
                return id;
            } else {
                return null;
            }
        },
        
        currentApp : function() {
            var id = PolyChrome.currentAppId();
            if (id!=null) {
                return PolyChrome.apps[id];
            } else {
                return null;
            }        
        },
        
        //create new id
        generateId : function() {
            do {
                var id = Utils.randomString();
            } while (id in PolyChrome.apps);
            return id;
        }
    }
}())