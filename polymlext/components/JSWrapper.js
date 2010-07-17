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
                response = eval(request.arg1);
                if (response==""||response==null) {
                    response = "";
                }
                break;

            case 3: //one of js functions
                switch (request.arg1) {
                    case "getElementById":
                        var elem = document.getElementById(request.arg2);
                        if (elem==null) {
                            response = "null";
                        } else {
                            this.elements.push(elem);
                            response = (this.elements.length-1)+"";
                        }
                        break;
                    case "innerHTML":
                        var elem = this.elements[request.arg2];
                        if (elem&&elem.innerHTML) {
                            if (request.arg3) {
                                elem.innerHTML = request.arg3;
                                response = "done";
                            } else {
                                response = elem.innerHTML;
                            }
                        } else {
                            response = "exception";
                        }
                        break;
                    case "value":
                        var elem = this.elements[request.arg2];
                        if (elem&&elem.value) {
                            if (request.arg3) {
                                elem.value = request.arg3;
                                response = "done";
                            } else {
                                response = elem.value;
                            }
                        } else {
                            //TODO: must send things to Poly in packets, so we
                            //can indicate exceptions..
                            response = "exception";
                        }
                        break;
                    case "clearMemory":
                        this.elements = [];
                        break;
                }
                break;

            case 4: //events
                switch (request.arg1) {
                    case "addEventListener":
                        var elem = this.elements[request.arg2];
                        var found = false;
                        var l = [request.arg3, request.arg4];
                        if (typeof(this.listeners[elem])!="undefined") {
                            for (var i=0, len=this.listeners[elem].length; i<len; i++) {
                                if (this.listeners[elem][i]!=null) {
                                    found = (this.listeners[elem][i][0]==l[0]
                                            &&this.listeners[elem][i][1]==l[1]);
                                }
                                if (found) break;
                            }
                        } else {
                            this.listeners[elem] = [];
                        }
                        if (!found) {
                            var self = this;
                            var f = function(event) {
                                var f = request.arg4;
                                var matches = f.match(/{[^}]+}/g);
                                try {
                                    for (i=0, len=matches.length; i<len; i++) {
                                        //cut off the { } from end and beginning
                                        var c = matches[i].substring(1, matches[i].length-1);
                                        var r = eval(c);
                                        f = f.replace(matches[i], r);
                                    }
                                } catch (e) {
                                    //if something will go wrong we'll just send
                                    //the string as it was, we could also alternatively
                                    //send an exception. TODO: think about that =)
                                }
                                self.server.send(f);
                            }
                            l.push(f)
                            this.listeners[elem].push(l);
                            var n = this.listeners[elem].length-1;
                            elem.addEventListener(request.arg3, this.listeners[elem][n][2], false);
                        }
                        break;
                    case "removeEventListener":
                        var elem = this.elements[request.arg2];

                        var found = false;
                        var l = [request.arg3, request.arg4];
                        var i;
                        if (typeof(this.listeners[elem])!="undefined") {
                            for (i=0, len=this.listeners[elem].length; i<len; i++) {
                                if (this.listeners[elem][i]!=null) {
                                    found = (this.listeners[elem][i][0]==l[0]
                                            &&this.listeners[elem][i][1]==l[1]);
                                }
                                if (found) break;
                            }
                        }
                        if (found) {
                            elem.removeEventListener(request.arg3, this.listeners[elem][i][2], false);
                            //delete this.listeners[hash];
                            //TODO: we should completely remove listeners instead of just nullifying
                            this.listeners[elem][i] = null;
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

