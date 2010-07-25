const Cc = Components.classes;
const Ci = Components.interfaces;
const Cr = Components.results;

var console;

function Memory() {
    this.init();
}
Memory.prototype = {
    addElement : function(elem) {
        if (elem==null) {
            return "null";
        } else {
            this.elements[this.currentNamespace].push(elem);
            return (this.elements[this.currentNamespace].length-1)+"";
        }
    },

    getElement : function(n) {
        return this.elements[this.currentNamespace][n];
    },

    clearMemory : function(ns) {
        if (ns==null) {
            this.init();
        } else {
            delete this.elements[ns];
            this.currentNamespace = "main";
        }
    },

    switchNamespace : function(ns) {
        if (ns==null) {
            this.currentNamespace = "main";
        } else {
            this.currentNamespace = ns;
            if (!this.elements[this.currentNamespace]) {
                this.elements[this.currentNamespace] = [];
            }
        }
    },

    init : function() {
        this.elements = {"main":[]};
        this.currentNamespace = "main";
    }
}

JSWrapper.prototype = {
    process : function(req) {
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
                        response = this.Memory.addElement(elem);
                        break;
                    case "childNodes":
                        var elem = this.Memory.getElement(request.arg2);
                        var elems = elem.childNodes;
                        response = "[";
                        for (var i=0, len=elems.length; i<len; i++) {
                            response += "\""+this.Memory.addElement(elems[i])+"\",";
                        }
                        response = response.substr(0, response.length-1)+"]";
                        break;
                    case "parentNode":
                        var elem = this.Memory.getElement(request.arg2);
                        response = this.Memory.addElement(elem.parentNode);
                        break;
                    case "firstChild":
                        var elem = this.Memory.getElement(request.arg2);
                        response = this.Memory.addElement(elem.firstChild);
                        break;
                    case "lastChild":
                        var elem = this.Memory.getElement(request.arg2);
                        response = this.Memory.addElement(elem.lastChild);
                        break;
                    case "nextSibling":
                        var elem = this.Memory.getElement(request.arg2);
                        response = this.Memory.addElement(elem.nextSibling);
                        break;
                    case "previousSibling":
                        var elem = this.Memory.getElement(request.arg2);
                        response = this.Memory.addElement(elem.previousSibling);
                        break;
                    case "innerHTML":
                        var elem = this.Memory.getElement(request.arg2);
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
                        var elem = this.Memory.getElement(request.arg2);
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
                    case "getAttribute":
                        var elem = this.Memory.getElement(request.arg2);
                        response = elem.getAttribute(request.arg3);
                        break;
                    case "setAttribute":
                        var elem = this.Memory.getElement(request.arg2);
                        response = elem.setAttribute(request.arg3, request.arg4);
                        break;
                    case "removeAttribute":
                        var elem = this.Memory.getElement(request.arg2);
                        response = elem.removeAttribute(request.arg3);
                        break;
                    case "createElement":
                        var elem = document.createElement(request.arg2);
                        response = this.Memory.addElement(elem);
                        break;
                    case "createTextNode":
                        var elem = document.createTextNode(request.arg2);
                        response = this.Memory.addElement(elem);
                        break;
                    case "appendChild":
                        var parent = this.Memory.getElement(request.arg2);
                        var child = this.Memory.getElement(request.arg3);
                        parent.appendChild(child);
                        break;
                    case "removeChild":
                        var parent = this.Memory.getElement(request.arg2);
                        var child = this.Memory.getElement(request.arg3);
                        parent.removeChild(child);
                        break;
                    case "replaceChild":
                        var parent = this.Memory.getElement(request.arg2);
                        var child_from = this.Memory.getElement(request.arg3);
                        var child_to = this.Memory.getElement(request.arg4);
                        parent.replaceChild(child_from, child_to);
                        break;
                    case "style":
                        var elem = this.Memory.getElement(request.arg2);
                        if (request.arg4) {
                            elem.style[request.arg3] = request.arg4;
                            response = "done";
                        } else {
                            response = elem.style[request.arg3];
                        }
                        break;
                    case "clearMemory":
                        if (!request.arg2) {
                            request.arg2 = null;
                        }
                        this.Memory.clearMemory(request.arg2);
                        break;
                    case "switchNamespace":
                        if (!request.arg2) {
                            request.arg2 = null;
                        }
                        this.Memory.switchNamespace(request.arg2);
                        break;
                }
                break;

            case 4: //events
                switch (request.arg1) {
                    case "addEventListener":
                        var elem = this.Memory.getElement(request.arg2);
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
                                var matches = f.match(/{.*?}/g);
                                try {
                                    for (i=0, len=matches.length; i<len; i++) {
                                        //cut off the { } from end and beginning
                                        var c = matches[i].substring(1, matches[i].length-1);
                                        //TODO: instead of eval use e.g. event[matches[i]]()
                                        var r = eval(c);
                                        f = f.replace(matches[i], r);
                                    }
                                } catch (e) {
                                    //if something will go wrong we'll just send
                                    //the string as it was, we could also alternatively
                                    //send an exception. TODO: think about that =)
                                }
                                self.socket1.send(f);
                            }
                            l.push(f)
                            this.listeners[elem].push(l);
                            var n = this.listeners[elem].length-1;
                            elem.addEventListener(request.arg3, this.listeners[elem][n][2], false);
                        }
                        break;
                    case "removeEventListener":
                        var elem = this.Memory.getElement(request.arg2);

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
                    case "setInterval":
                        var self = this;
                        var f = function() {
                            self.socket1.send(request.arg2);
                        }
                        this.timers.push(f)
                        var n = this.timers.length-1;
                        console.log(parseInt(request.arg3));
                        document.defaultView.wrappedJSObject.setInterval(this.timers[n], parseInt(request.arg3));
                        break;
                }
                break;
            case 5: //custom wrappers
                var unsafeWin = document.defaultView.wrappedJSObject;
                var response = unsafeWin[request.wrapper].processRequest(request, this.Memory);
                break;

            default:
                console.log("Unexpected request from Poly", "error");
        }
        return response;
    },

    wrapperListener: function(event) {
        console.log(event, "LISTENED");
        console.log(event.foo, "LISTENED");
    },

    init : function(doc, s) {
        this._document = doc;
        this.socket1 = s;
        console = Cc["@ed.ac.uk/poly/console;1"].getService().wrappedJSObject;
        this.nativeJSON = Cc["@mozilla.org/dom/json;1"].createInstance(Ci.nsIJSON),
        this.listeners = {};
        this.timers = [];
        this.Memory = new Memory;
        this._document.addEventListener("PolyMLextWrapperEvent", this.wrapperListener, false, true);
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

