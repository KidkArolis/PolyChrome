const Cc = Components.classes;
const Ci = Components.interfaces;
const Cr = Components.results;

var console;

JSWrapper.prototype = {
    process : function(req) {
        //var document = window.content.document;
        var document = this._document;
        var response = "";
        try {
            var request = this.nativeJSON.decode(req);
        } catch (e) {
            console.log("Could not decode JSON.\nRequest:\n"+req+"\nReason:\n"+e, "error");
            return "";
        }
        if (!request.hasOwnProperty("type")) {
            console.log("Unexpected request from Poly", "error");
            return "";
        }
        switch (request.type) {
            case 0: //output
                console.log(request.output, "poly");
                break;

            case 1: //errors
                console.log(request.output, "poly-error");
                break;

            case 2: //code to evaluate
                //console.log(document.defaultView.content.document.defaultView.content.document.location.href);
                //response = document.defaultView.eval.call(document.defaultView, request.code);
                //console.log("EVALS RESPONSE: " + response);
                response = eval(request.code);
                if (response==""||response==null) {
                    response = "";
                }
                break;

            case 3: //one of js functions
                switch (request.op) {
                    case "getElementById":
                        var elem = document.getElementById(request.id);
                        if (elem==null) {
                            response = "null";
                        } else {
                            this.elements.push(elem);
                            response = (this.elements.length-1)+"";
                        }
                        break;
                    case "innerHTML":
                        var elem = this.elements[request.arg1];
                        if (elem) {
                            if (request.arg2) {
                                elem.innerHTML = request.arg2;
                                response = "done";
                            } else {
                                response = elem.innerHTML;
                            }
                        } else {
                            response = "exception";
                        }
                        break;
                    case "value":
                        var elem = this.elements[request.arg1];
                        if (elem) {
                            if (request.arg2) {
                                elem.value = request.arg2;
                                response = "done";
                            } else {
                                response = elem.value;
                            }
                        } else {
                            response = "exception";
                        }
                        break;
                    case "clearMemory":
                        this.elements = [];
                        break;
                }
                break;

            case 4: //events
                switch (request.op) {
                    case "addEventListener":
                        var elem = this.elements[request.eid];
                        var found = false;
                        var l = [request.eventType, request.f];
                        if (typeof(this.listeners[elem])!="undefined") {
                            for (var i=0, len=this.listeners[elem].length; i<len; i++) {
                                found = (this.listeners[elem][i][0]==l[0]&&this.listeners[elem][i][1]==l[1]);
                                if (found) break;
                            }
                        } else {
                            this.listeners[elem] = [];
                        }
                        if (!found) {
                            var self = this;
                            var f = function(e) {
                                self.server.send(request.f);
                            }
                            l.push(f)
                            this.listeners[elem].push(l);
                            var n = this.listeners[elem].length-1;
                            elem.addEventListener(request.eventType, this.listeners[elem][n][2], false);
                        }

                        //TODO not a good hash, shouldn't depend on eid, but on the
                        //object referred
                        /*
                        var self = this;
                        var elem = this.elements[request.eid];
                        var l = {"elem":elem, "eventType":request.eventType, "f":request.f};
                        var found = false;
                        for (var i=0, len=this.listeners.length; i<len; i++) {
                            if (this.listeners==l) {
                                found = true;
                                break;
                            }
                        }
                        if (!found) {
                            this.listeners.push(l);
                        }
                        if (!this.listeners[hash]) {
                            this.listeners[hash] = function(e) {
                                self.server.send(request.f);
                            }
                            elem.addEventListener(request.eventType, this.listeners[hash], false);
                        }
                        */
                        break;
                    case "removeEventListener":
                        var elem = this.elements[request.eid];

                        var found = false;
                        var l = [request.eventType, request.f];
                        var i;
                        if (typeof(this.listeners[elem])!="undefined") {
                            for (i=0, len=this.listeners[elem].length; i<len; i++) {
                                found = (this.listeners[elem][i][0]==l[0]&&this.listeners[elem][i][1]==l[1]);
                                if (found) break;
                            }
                        }
                        if (found) {
                            elem.removeEventListener(request.eventType, this.listeners[elem][i][2], false);
                            //delete this.listeners[hash];
                            //TODO: we should completely remove listeners instead of just nullifying
                            this.listeners[elem][i][2] = null;
                        }

                        break;
                    case "onMouseMove":
                        var hash = request.elem + request.f;
                        var self = this;
                        this.listeners[hash] = function(e) {
                            self.server.send(request.f + "("+e.clientX+","+e.clientY+");");
                        }
                        document.getElementById(request.elem).addEventListener("mousemove", this.listeners[hash], false);
                        break;
                }
                break;

            default:
                console.log("Unexpected request from Poly", "error");
        }
        return response;
    },

    init : function(doc, s) {
        this._document = doc;
        this.server = s;
        console = Cc["@ed.ac.uk/poly/console;1"].getService().wrappedJSObject;
        this.nativeJSON = Cc["@mozilla.org/dom/json;1"].createInstance(Ci.nsIJSON),
        this.listeners = {};
        this.elements = [];
    }
}

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

