const Cc = Components.classes;
const Ci = Components.interfaces;
const Cr = Components.results;

JSWrapper.prototype = (function() {

    var _document;
    var console;
    var nativeJSON = Cc["@mozilla.org/dom/json;1"].createInstance(Ci.nsIJSON);
    var Server;

    var listeners = {};
    var elements = [];

    var process = function(req) {
        //var document = window.content.document;
        var document = this._document;
        var response = "";
        try {
            var request = nativeJSON.decode(req);
        } catch (e) {
            console.log("Could not decode JSON. Reason: " + e, "error");
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
                if (response==""||response==null) {
                    response = "done";
                }
                break;
            //one of js functions
            case 3:
                switch (request.op) {
                    case "getElementById":
                        var elem = document.getElementById(request.id);
                        if (elem==null) {
                            response = "null";
                        } else {
                            this.elements.push(elem);
                            response = (this.elements.length-1)+"";
                        }
                        console.log(response);
                        break;
                    case "innerHTML":
                        var elem = this.elements[request.eid];
                        if (elem) {
                            if (request.setNewValue) {
                                elem.innerHTML = request.newValue;
                                response = "done";
                            } else {
                                response = elem.innerHTML;
                            }
                        } else {
                            response = "exception";
                        }
                        break;
                    case "clearMemory":
                        this.elements = [];
                        response = "done";
                        break;

                }
                break;
            //add event listener
            case 4:
                /*
                f = function(e) {
                    //console.log('gotta call ' + request.f);
                    //var serializer = new ONEGEEK.GSerializer();
                    //var xml = serializer.serialize(e, 'Event');
                    //Server.send(e.originalTarget.toString());
                    Server.send(request.f);
                }
                */
                var hash = request.elem + request.eventType + request.f;
                var self = this;
                this.listeners[hash] = function(e) {
                    self.Server.send(request.f);
                }
                document.getElementById(request.elem).addEventListener(request.eventType, this.listeners[hash], false);
                response = "done";
                break;
            //remove event listener
            case 5:
                var hash = request.elem + request.eventType + request.f;
                document.getElementById(request.elem).removeEventListener(request.eventType, this.listeners[hash], false);
                delete this.listeners[hash];
                response = "done";
                break;
            //onMouseMove
            case 6:
                /*
                f = function(e) {
                    //console.log('gotta call ' + request.f);
                    //var serializer = new ONEGEEK.GSerializer();
                    //var xml = serializer.serialize(e, 'Event');
                    //Server.send(e.originalTarget.toString());
                    Server.send(request.f);
                }
                */
                var hash = request.elem + request.f;
                this.listeners[hash] = function(e) {
                    this.Server.send(request.f + "("+e.clientX+","+e.clientY+")");
                }
                document.getElementById(request.elem).addEventListener("mousemove", this.listeners[hash], false);
                response = "done";
                break;
            default:
                console.log("unexpected request from Poly", "error");
        }
        return response;
    }
    var init = function(doc, s) {
        this._document = doc;
        console = Cc["@ed.ac.uk/poly/console;1"].getService().wrappedJSObject;
        this.Server = s;
    }

    return {
        init: init,
        process : process,
        Server : Server,
        listeners : listeners,
        _document : _document,
        elements : elements
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

