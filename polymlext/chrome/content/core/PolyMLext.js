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
            PolyMLext.debug = new PolyMLext.DebugConsole();
            
            PolyMLext.prefs.alwaysEnabled = Application.prefs.get(
                "extensions.polymlext@ed.ac.uk.alwaysEnabled");
            PolyMLext.prefs.PolyMLPath = Application.prefs.get(
                "extensions.polymlext@ed.ac.uk.PolyMLPath");
            PolyMLext.prefs.consoleMinimizedOnStartup = Application.prefs.get(
                "extensions.polymlext@ed.ac.uk.Console.minimizedOnStartup");
            
            PolyMLext.findPoly();
            
            //statically call the clean method
            PolyMLext.Sandbox.prototype.clean();
            
            PolyMLext.browserUI = new PolyMLext.BrowserUI({
                onDocumentLoad : PolyMLext.processDoc,
                onTabSelect : PolyMLext.onTabSelect,
                onTabClose : PolyMLext.onTabClose,
                onTabMove : PolyMLext.onTabMove
            });
            
            //observe changes to the custom polyml path option
            PolyMLext.prefs.PolyMLPath.events.addListener("change", function() {
                PolyMLext.findPoly();
                PolyMLext.browserUI.update();
                PolyMLext.removeHeaps();
            });
        },
        
        processDoc : function(doc) {
            var tab = Utils.getTabForDocument(doc);
            
            //if this tab is fishy (not your regular tab),
            //don't create poly for it
            //TODO: explore when this happens...
            if (!tab || !tab.hasAttribute) return;
            
            var containsSML = PolyMLext.containsSML(doc);
            
            //check if the tab is being reused
            if (tab.hasAttribute("polymlext-tabid")) {
                var id = tab.getAttribute("polymlext-tabid");
                PolyMLext.apps[id].doc = doc;
                PolyMLext.apps[id].active =
                    (PolyMLext.apps[id].active && containsSML)
                    || (PolyMLext.polyFound
                        && PolyMLext.prefs.alwaysEnabled.value
                        && containsSML);
                PolyMLext.apps[id].containsSML = containsSML;
            } else {
                var id = PolyMLext.generateId();
                tab.setAttribute("polymlext-tabid", id);
                PolyMLext.apps[id] = {
                    doc : doc,
                    active : PolyMLext.polyFound
                        && PolyMLext.prefs.alwaysEnabled.value
                        && containsSML,
                    containsSML : containsSML,
                    console : new PolyMLext.Console(),
                    poly : null
                };
            }
            
            //should we start the PolyML process?
            if (PolyMLext.apps[id].active) {
                PolyMLext.startPoly(id);
            }
            
            //add event listener for page unload
            doc.defaultView.addEventListener(
                    "unload", PolyMLext.onDocumentUnload, true);
        },
        
        onDocumentUnload : function(event) {
            var doc = event.originalTarget;
            var tab = Utils.getTabForDocument(doc);
            //if tab was closed we don't do anything
            //as this will be handled by the onTabClose handler
            if (tab!=false) {
                var id = tab.getAttribute("polymlext-tabid");
                var c = PolyMLext.apps[id];
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
            var app = PolyMLext.apps[id];
            if (app.poly != null) {
                app.poly.destroy();
            }
            app.console.destroy();
            delete PolyMLext.apps[id];
        },
        
        onTabMove : function(event) {
            /*
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
            */
        },
        
        startPoly : function(id) {
            if (!PolyMLext.polyFound) {
                return;
            }
            if (id==undefined) {
                id = PolyMLext.currentAppId();
                if (id==null) {
                    return;
                }
            }
            
            var app = PolyMLext.apps[id];
            app.poly = new PolyMLext.Poly(app.doc, app.console);
            app.console.poly = app.poly;
            app.console.minimized = this.prefs.consoleMinimizedOnStartup.value;
            app.active = true;
            app.poly.init();
            
            //check if we should update the GUI
            if (content.document==app.doc) {
                PolyMLext.browserUI.update();
            }
        },
        
        stopPoly : function(id) {
            if (id==undefined) {
                id = PolyMLext.currentAppId();
                if (id==null) {
                    return;
                }
            }
            
            var app = PolyMLext.apps[id];
            app.active = false;
            if (app.poly != null) {
                app.poly.destroy();
                app.poly = null;
            }
            
            //check if we should update the GUI
            if (content.document==app.doc) {
                PolyMLext.browserUI.update();
            }
        },        
        
        findPoly : function() {
            if (PolyMLext.prefs.PolyMLPath.value=="") {
                //otherwise look for the path using a script
                var binpath = Utils.getExtensionPath();
                binpath.append("poly");
                binpath.append("bin");
                binpath.append("findpoly.sh");
                var process = Utils.startProcess(binpath, [], true);
                PolyMLext.polyFound = (process.exitValue==0);
            } else {
                var path = PolyMLext.prefs.PolyMLPath.value + "/bin/poly";
                PolyMLext.polyFound = Utils.fileExists(path);
            }
            return PolyMLext.polyFound;
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
            polyext_heap.append("polymlext.polyml-heap");
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
            if (tab.hasAttribute("polymlext-tabid")) {
                var id = tab.getAttribute("polymlext-tabid");
                return id;
            } else {
                return null;
            }
        },
        
        currentApp : function() {
            var id = PolyMLext.currentAppId();
            if (id!=null) {
                return PolyMLext.apps[id];
            } else {
                return null;
            }        
        },
        
        //create new id
        generateId : function() {
            do {
                var id = Utils.randomString();
            } while (id in PolyMLext.apps);
            return id;
        }
    }
}())