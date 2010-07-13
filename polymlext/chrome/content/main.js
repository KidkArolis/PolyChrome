var PolyMLext = (function ()
{
    var console;

    var polyPages = [];

    var lookForPolyML = function(doc) {
        var code;
        var scripts = doc.getElementsByTagName("script");
        if (scripts!=null) {
            for (var i=0, len=scripts.length; i<len; i++) {
                if (scripts[i].getAttribute("type")=="application/x-polyml") {
                    code = scripts[i].innerHTML;
                    break;
                }
            }
        }
        if (code!=null) {
            console.log("Found PolyML code on page: " + doc.location.href);
            var poly = createPolyInstance(doc, code);
            polyPages.push({"document": doc, "poly":poly});
            //add event listener for page unload
            doc.defaultView.addEventListener("unload",
                onPageUnload, true);
        }
    }

    var createPolyInstance = function(doc, code) {
        var poly = Cc["@ed.ac.uk/poly;1"].createInstance().wrappedJSObject;
        poly.processCode(doc, code);
        return poly;
    }

    var onPageLoad = function(aEvent) {
        if (!aEvent) { return; }
        if (aEvent.originalTarget.nodeName != "#document") {return;}
        if (aEvent.originalTarget instanceof HTMLDocument) {
            lookForPolyML(aEvent.originalTarget);
        }
    }

    var onPageUnload = function(aEvent) {
        var doc = aEvent.originalTarget;
        console.log("Page unloaded:" + doc.location.href);
        for (var i=0, len=polyPages.length; i<len; ++i){
            if (polyPages[i].document == doc) {
                polyPages[i].poly.destroy();
                polyPages[i].poly = null;
                polyPages.splice(i, 1);
                break;
            }
        }
        console.log("Pages that are still active: ");
        for (var i=0, len=polyPages.length; i<len; ++i) {
            console.log(polyPages[i].poly.server.port());
        }
    }

    var bindLoadUnload = function() {
        var appcontent = document.getElementById("appcontent");   // browser
        if(appcontent) {
            appcontent.addEventListener("load", onPageLoad, true);
        }
    }

    var init = function () {
        console = Cc["@ed.ac.uk/poly/console;1"].getService().wrappedJSObject;
        bindLoadUnload();
    }

    return {
        init: init
    }

}());

PolyMLext.init();

