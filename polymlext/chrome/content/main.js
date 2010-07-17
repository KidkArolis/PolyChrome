var PolyMLext = (function ()
{
    var console;
    var polyPages = [];

    var lookForPolyMLCode = function(doc) {
        var poly;
        var scripts = doc.getElementsByTagName("script");
        if (scripts==null) return;
        for (var i=0, len=scripts.length; i<len; i++) {
            if (scripts[i].getAttribute("type")=="application/x-polyml") {
                console.log("Found PolyML code on: " + doc.location.href);
                var poly = Cc["@ed.ac.uk/poly;1"].createInstance().wrappedJSObject;
                poly.init(doc);
                polyPages.push({"document": doc, "poly":poly});
                //add event listener for page unload
                doc.defaultView.addEventListener("unload", onPageUnload, true);
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
//        console.log("Page unloaded:" + doc.location.href);
        for (var i=0, len=polyPages.length; i<len; ++i){
            if (polyPages[i].document == doc) {
                polyPages[i].poly.destroy();
                polyPages[i].poly = null;
                polyPages.splice(i, 1);
                break;
            }
        }
    }

    var bindLoadUnload = function() {
        var browser = document.getElementById("appcontent");
        if(browser) {
            browser.addEventListener("load", onPageLoad, true);
        }
    }

    var init = function () {
        console = Cc["@ed.ac.uk/poly/console;1"].getService().wrappedJSObject;
        console.setupButtons(document.getElementById("polymlext-enableConsole-button"),
            document.getElementById("polymlext-showConsole-button"));
        bindLoadUnload();
    }

    return {
        init: init
    }

}());

window.addEventListener("load", PolyMLext.init, false)

