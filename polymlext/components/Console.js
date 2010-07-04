const Cc = Components.classes;
const Ci = Components.interfaces;
const Cr = Components.results;

Console.prototype = (function() {
    var win;
    var initialized = false;
    var ready = false;
    
    var _log = function(m, level, location) {
        if (initialized&&ready) {  
            var prefix = "INFO: ";   
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
            win.document.getElementById(location).value = win.document.getElementById(location).value + prefix + m + "\n";
            win.focus();
        } else if (initialized&&!ready) {
            // Now it is time to create the timer...  
            var timer = Components.classes["@mozilla.org/timer;1"]
               .createInstance(Components.interfaces.nsITimer);
            // ... and to initialize it, we want to call event.notify() ...
            // ... one time after exactly ten second. 
            timer.initWithCallback(
                { notify: function() { log(m); } },
                10,
                Components.interfaces.nsITimer.TYPE_ONE_SHOT
            );
        } else {
            init();
            log(m);
        }
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
    
    var setReady = function() {
        ready = true;
    }
    
    var init = function() {
        initialized = true;
        var ww = Components.classes["@mozilla.org/embedcomp/window-watcher;1"]
                    .getService(Components.interfaces.nsIWindowWatcher);
        win = ww.openWindow(null, "chrome://polymlext/content/console.xul",
                         "console", "chrome,centerscreen, resizable=no", null);
        win.onload = setReady;
        return win;
    }
    
    return {
        init: init,
        log : log,
        poly : poly,
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
