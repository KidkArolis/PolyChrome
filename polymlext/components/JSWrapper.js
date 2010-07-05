const Cc = Components.classes;
const Ci = Components.interfaces;
const Cr = Components.results;

JSWrapper.prototype = (function() {

    var _document;
    var console;
    var nativeJSON = Cc["@mozilla.org/dom/json;1"].createInstance(Ci.nsIJSON);
        
    var process = function(req) {
        //var document = window.content.document;
        var document = _document;
        var response = "";
        try {
            var request = nativeJSON.decode(req);
        } catch (e) {
            console.log("Could not decode JSON. Reason: " + e, "error")
            return response;
        }
        switch (request.type) {
            //output
            case 1:
                console.poly(request.output);
                break;
            //code to evaluate
            case 2:
                response = eval(request.code);
                break;
            //add event listener
            case 3:
                console.log("Event listeners are not implemented");
                break;
            default:
                console.log("unexpected request from Poly", "error");
        }
        return response;
    }
    var init = function(doc) {
        _document = doc;
        console = Cc["@ed.ac.uk/poly/console;1"].getService().wrappedJSObject;
    }
    
    return {
        init: init,
        process : process
    }
}());

// turning JSWrapper Class into an XPCOM component
Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");
function JSWrapper() {
    this.wrappedJSObject = this;
}
prototype2 = {
  classDescription: "A JSWrapper for PolyML extension. All requests from Poly will be handled through this class.",
  classID: Components.ID("{2925c41f-4398-4d43-899d-f047bc668d29}"),
  contractID: "@ed.ac.uk/poly/jswrapper;1",
  QueryInterface: XPCOMUtils.generateQI(),
}
//add the required XPCOM glue into the Poly class
for (attr in prototype2) {
    JSWrapper.prototype[attr] = prototype2[attr];
}
var components = [JSWrapper];
function NSGetModule(compMgr, fileSpec) {
  return XPCOMUtils.generateModule(components);
}
