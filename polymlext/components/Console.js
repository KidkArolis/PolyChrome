const Cc = Components.classes;
const Ci = Components.interfaces;
const Cr = Components.results;

//A lot of variables in this case are not exposed to the outside,
//which means they are shared between instances of Console,
//but that's ok, because Console should be used as a service (one instance)
Console.prototype = (function() {
    var win;
    var initialized = false;
    var ready = false;

    var tm = Cc["@mozilla.org/thread-manager;1"].getService();

    var _log = function(m, level, location) {
        //just trying to catch such error
        if (!tm.isMainThread) dump("NOT THE MAIN THREAD :(")
        if (initialized&&ready) {
            var newline = location=="polyml" ? "" : "\n";
            var prefix = level==null ? "INFO: " : (level=="" ? "" : level+": ");
            var textbox = win.document.getElementById(location);
            textbox.value += prefix + m + newline;
            var ti = win.document.getAnonymousNodes(textbox)[0].childNodes[0];
            ti.scrollTop = ti.scrollHeight;
        }
    }

    var log2 = function(m, level) {
        consoleService.logStringMessage("PolyMLext: " + m);
    }

    var poly2 = function(m, level) {
        consoleService.logStringMessage("Poly Output:\n" + m);
    }

    var log = function(m, level) {
        _log(m, level, 'debug');
    }

    var poly = function(m, level) {
        _log(m, "", 'polyml');
    }

    var clearConsole = function() {
        win.document.getElementById("debug").value = "";
        win.document.getElementById("polyml").value = "";
    }

    var setReady = function() {
        ready = true;
        win.document.getElementById("clear").addEventListener("click", clearConsole, false);
    }

    var init = function() {
        initialized = true;
        var ww = Components.classes["@mozilla.org/embedcomp/window-watcher;1"]
                    .getService(Components.interfaces.nsIWindowWatcher);
        win = ww.openWindow(null, "chrome://polymlext/content/console.xul",
                         "console", "chrome,resizable=no", null);
        win.onload = setReady;

        /*this.consoleService = Components.classes["@mozilla.org/consoleservice;1"]
                            .getService(Components.interfaces.nsIConsoleService);*/
    }

    return {
        init: init,
        log : log,
        poly : poly
    }
}());

// turning Console Class into an XPCOM component
Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");
function Console() {
    this.wrappedJSObject = this;
    this.init();
}
prototype2 = {
  classDescription: "A special Console for PolyML extension",
  classID: Components.ID("{483aecbc-42e7-456e-b5b3-2197ea7e1fb4}"),
  contractID: "@ed.ac.uk/poly/console;1",
  QueryInterface: XPCOMUtils.generateQI(),
}
//add the required XPCOM glue into the Poly class
for (attr in prototype2) {
    Console.prototype[attr] = prototype2[attr];
}
var components = [Console];
function NSGetModule(compMgr, fileSpec) {
  return XPCOMUtils.generateModule(components);
}

