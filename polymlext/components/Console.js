const Cc = Components.classes;
const Ci = Components.interfaces;
const Cr = Components.results;

//A lot of variables in this case are not exposed to the outside,
//which means they are shared between instances of Console,
//but that's ok, because Console should be used as a service (one instance)
Console.prototype = (function() {
    var win;
    var show = false;
    var enable = true;
    var buffer = [];
    var buffer2 = "";
    var buffer3 = "";
    var consoleService;
    var scriptError;

    var enableButton;
    var showButton;
    var buttonClicked = "";

    var tm = Cc["@mozilla.org/thread-manager;1"].getService();

    var log = function(m, level) {
        if (level=="poly-error") {
            scriptError.init(m, "aSourceName", "aSourceLine", "aLineNumber",
                           "aColumnNumber", 0, "aCategory");
            consoleService.logMessage(scriptError);
        }
        if (enable) {
            if (show) {
                if (level=="poly"||level=="poly-error") {
                    var textbox = win.document.getElementById("polyml");
                    textbox.value += m;
                    scrollDown(textbox);
                } else {
                    var textbox = win.document.getElementById("debug");
                    if (level==null) {
                        level = "INFO";
                    }
                    textbox.value += level + ": " + m + "\n";
                    scrollDown(textbox);
                }
            } else {
                buffer.push({m:m, level:level});
            }
        }
    }

    var scrollDown = function(textbox) {
        var ti = win.document.getAnonymousNodes(textbox)[0].childNodes[0];
        ti.scrollTop = ti.scrollHeight;
    }

    var clearConsole = function() {
        win.document.getElementById("debug").value = "";
        win.document.getElementById("polyml").value = "";
    }

    var flushBuffer = function() {
        win.document.getElementById("debug").value = buffer2;
        win.document.getElementById("polyml").value = buffer3;
        for (var i=0, len=buffer.length; i<len; i++) {
            var msg = buffer[i];
            log(msg.m, msg.level);
        }
        buffer = [];
    }

    var onReady = function() {
        show = true;
        setButtonLabels();
        //TODO: we add, but never remove, does closing window remove the listener?
        win.document.getElementById("clear").addEventListener("click", clearConsole, false);
        flushBuffer();
        win.onunload = function() { onClose(); };
    }

    var closeWindow = function() {
        win.close();
    }

    var openWindow = function() {
        var ww = Components.classes["@mozilla.org/embedcomp/window-watcher;1"]
                    .getService(Components.interfaces.nsIWindowWatcher);
        win = ww.openWindow(null, "chrome://polymlext/content/console.xul",
                         "console", "chrome,resizable=no", null);
        win.onload = function() { onReady(); };
    }

    var init = function() {
        openWindow();
        consoleService = Components.classes["@mozilla.org/consoleservice;1"]
                            .getService(Components.interfaces.nsIConsoleService);
        scriptError = Components.classes["@mozilla.org/scripterror;1"]
                        .createInstance(Components.interfaces.nsIScriptError);
    }

    var setButtonLabels = function() {
        enableButton.label =
            enable ? "Disable console" : "Enable console";
        showButton.label =
            show ? "Hide console" : "Show console";
        showButton.disabled =
            enable ? false : true;
    }

    var onToggleEnable = function() {
        enable = !enable;
        if (!enable) {
            buttonClicked = "enable";
            if (show) {
                closeWindow();
            } else {
                buffer2 = "";
                buffer3 = "";
                setButtonLabels();
            }
        } else {
            openWindow();
        }
    }

    var onToggleShow = function() {
        show = !show;
        if (!show) {
            buttonClicked = "show";
            closeWindow();
        } else {
            openWindow();
        }
    }

    var onClose = function() {
        if (buttonClicked=="show") {
            buffer2 = win.document.getElementById("debug").value;
            buffer3 = win.document.getElementById("polyml").value;
        }
        if (buttonClicked=="enable") {
            buffer2 = "";
            buffer3 = "";
        }
        if (buttonClicked=="") {
            onToggleEnable();
        }
        setButtonLabels();
        buttonClicked = "";
    }

    var setupButtons = function(eb, sb) {
        enableButton = eb;
        showButton = sb;
        enableButton.addEventListener("click", onToggleEnable, false);
        showButton.addEventListener("click", onToggleShow, false);
    }

    return {
        init: init,
        log : log,
        setupButtons : setupButtons,
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

