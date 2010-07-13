const Cc = Components.classes;
const Ci = Components.interfaces;
const Cr = Components.results;

Console.prototype = (function() {
    var win;
    var initialized = false;
    var ready = false;

    var tm = Cc["@mozilla.org/thread-manager;1"].getService();

    var consoleService;

    var _log = function(m, level, location) {

        if (!tm.isMainThread) {
            dump("NOT THE MAIN THREAD :(")
        }

        if (initialized&&ready) {
            var newline = "\n";
            var prefix = "INFO: ";
            var textbox = win.document.getElementById(location);
            switch (level) {
                case "empty":
                    prefix = ""
                    break;
                case "error":
                    prefix = "ERORR: "
                    break;
                case "warning":
                    prefix = "WARNING: "
                    break;
            }
            if (location=="polyml") {
                newline = "";
            }
            textbox.value += prefix + m + newline;
            var ti = win.document.getAnonymousNodes(textbox)[0].childNodes[0];
            ti.scrollTop = ti.scrollHeight;
        } else if (initialized&&!ready) {
            // Now it is time to create the timer...
            var timer = Components.classes["@mozilla.org/timer;1"]
               .createInstance(Components.interfaces.nsITimer);
            // ... and to initialize it, we want to call event.notify() ...
            // ... one time after exactly ten second.
            timer.initWithCallback(
                { notify: function() { _log(m, level, location); } },
                10,
                Components.interfaces.nsITimer.TYPE_ONE_SHOT
            );
        } else {
            init();
            _log(m, level, location);
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
        _log(m, "empty", 'polyml');
    }

    var close = function() {
        win.close();
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

        /*consoleService = Components.classes["@mozilla.org/consoleservice;1"]
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

