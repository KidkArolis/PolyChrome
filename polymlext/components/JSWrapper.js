const Cc = Components.classes;
const Ci = Components.interfaces;
const Cr = Components.results;

var debug;

var document;

function Memory() {
    this.init();
}
Memory.prototype = {
    addReference : function(elem) {
        if (elem==null) {
            return "null";
        } else {
            this.elements[this.currentNamespace].push(elem);
            return (this.elements[this.currentNamespace].length-1)+"";
        }
    },
    getReference : function(n) {
        return this.elements[this.currentNamespace][n];
    },
    removeReference : function(n) {
        //TODO: this is not good, because if reference from the middle of
        //array is removed then the identifiers will not work anymore
        this.elements[this.currentNamespace].splice(n,1);
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
        this.ran = Math.floor(Math.random()*1000);
    }
}

function DOMWrappers (memory) {
    this.Memory = memory;
}
DOMWrappers.prototype = {
    getElementById : function(request) {
        var elem = document.getElementById(request.arg2);
        return this.Memory.addReference(elem);
    },
    getElementsByTagName: function(request) {
        var elems = document.getElementsByTagName(request.arg2);
        var response = "[";
        for (var i=0, len=elems.length; i<len; i++) {
            response += "\""+this.Memory.addReference(elems[i])+"\",";
        }
        response = response.substr(0, response.length-1)+"]";
        return response;
    },
    childNodes: function(request) {
        var elem = this.Memory.getReference(request.arg2);
        var elems = elem.childNodes;
        var response = "[";
        for (var i=0, len=elems.length; i<len; i++) {
            response += "\""+this.Memory.addReference(this.elems[i])+"\",";
        }
        response = response.substr(0, response.length-1)+"]";
        return response;
    },
    parentNode: function(request) {
        var elem = this.Memory.getReference(request.arg2);
        return this.Memory.addReference(elem.parentNode);
    },
    firstChild: function(request) {
        var elem = this.Memory.getReference(request.arg2);
        return this.Memory.addReference(elem.firstChild);
    },
    lastChild: function(request) {
        var elem = this.Memory.getReference(request.arg2);
        return this.Memory.addReference(elem.lastChild);
    },
    nextSibling: function(request) {
        var elem = this.Memory.getReference(request.arg2);
        return this.Memory.addReference(elem.nextSibling);
    },
    previousSibling: function(request) {
        var elem = this.Memory.getReference(request.arg2);
        return this.Memory.addReference(elem.previousSibling);
    },
    innerHTML: function(request) {
        var elem = this.Memory.getReference(request.arg2);
        if (elem&&elem.innerHTML!=null) {
            if (request.arg3) {
                elem.innerHTML = request.arg3;
                return "";
            } else {
                return elem.innerHTML;
            }
        } else {
            return "exception";
        }
    },
    value: function(request) {
        var elem = this.Memory.getReference(request.arg2);
        if (elem&&elem.value!=null) {
            if (request.arg3) {
                elem.value = request.arg3;
                return "";
            } else {
                return elem.value;
            }
        } else {
            //TODO: must send things to Poly in packets, so we
            //can indicate exceptions..
            return "exception";
        }
    },
    getAttribute: function(request) {
        var elem = this.Memory.getReference(request.arg2);
        return elem.getAttribute(request.arg3);
    },
    setAttribute: function(request) {
        var elem = this.Memory.getReference(request.arg2);
        return elem.setAttribute(request.arg3, request.arg4);
    },
    removeAttribute: function(request) {
        var elem = this.Memory.getReference(request.arg2);
        return elem.removeAttribute(request.arg3);
    },
    createElement: function(request) {
        var elem = document.createElement(request.arg2);
        return this.Memory.addReference(elem);
    },
    createTextNode: function(request) {
        var elem = document.createTextNode(request.arg2);
        return this.Memory.addReference(elem);
    },
    appendChild: function(request) {
        var parent = this.Memory.getReference(request.arg2);
        var child = this.Memory.getReference(request.arg3);
        this.parent.appendChild(child);
    },
    removeChild: function(request) {
        var parent = this.Memory.getReference(request.arg2);
        var child = this.Memory.getReference(request.arg3);
        this.parent.removeChild(child);
    },
    replaceChild: function(request) {
        var parent = this.Memory.getReference(request.arg2);
        var child_new = this.Memory.getReference(request.arg3);                   
        var child_old = this.Memory.getReference(request.arg4);
        this.parent.replaceChild(child_new, child_old);
    },
    style: function(request) {
        var elem = this.Memory.getReference(request.arg2);
        if (request.arg4) {
            elem.style[request.arg3] = request.arg4;
            return "";
        } else {
            return elem.style[request.arg3];
        }
    },
    clearMemory: function(request) {
        if (!request.arg2) {
            request.arg2 = null;
        }
        this.Memory.clearMemory(request.arg2);
    },
    switchNamespace: function(request) {
        if (!request.arg2) {
            request.arg2 = null;
        }
        this.Memory.switchNamespace(request.arg2);
    },
    removeReference: function(request) {
        this.Memory.removeReference(request.arg2);
    }
}


JSWrapper.prototype = {

    process : function(req) {
        
        //make document accessible globally in all wrappers
        document = this._document;
        
        var response = null;
        
        try {
            var request = this.nativeJSON.decode(req);
        } catch (e) {
            debug.error("Could not decode JSON.\nRequest:\n"+req+"\n",
                    this._document.location.href);
        }
        
        if (!request.hasOwnProperty("type")) {
            debug.error("Unexpected request from Poly",
                    this._document.location.href);
        }
        
        switch (request.type) {
            case 0: //output
                this.console.log(request.output);
                break;

            case 1: //errors
                this.console.log(request.output);
                break;

            case 2: //code to evaluate
                //NOT USED FOR SECURITY REASONS. perhaps evalInSandbox could be used..
                //response = document.defaultView.eval.call(document.defaultView, request.code);
                /*
                response = eval(request.arg1);
                if (response==""||response==null) {
                    response = "";
                }
                */
                break;

            case 3: //DOM function
                if (this.DOMWrappers[request.arg1] != undefined) {
                    response = this.DOMWrappers[request.arg1](request);
                    //if the wrapper does not return anything, set the
                    //response to null
                    if (response == undefined) {
                        response = null;
                    }
                } else {
                    debug.error(request.arg1 + " is not implemented",
                            this._document.location.href);
                }
                break;

            case 4: //events
                switch (request.arg1) {
                    case "addEventListener":
                        var elem = this.Memory.getReference(request.arg2);
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
                                        //only attributes of the event can be accessed, but not functions :-/
                                        var r = event[c];
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
                        var elem = this.Memory.getReference(request.arg2);

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
                        document.defaultView.wrappedJSObject.setInterval(this.timers[n], parseInt(request.arg3));
                        break;
                }
                break;
            case 5: //custom wrappers
                var unsafeWin = document.defaultView.wrappedJSObject;
                if (unsafeWin[request.wrapper]!=undefined) {
                    if (unsafeWin[request.wrapper][request.arg1]!=undefined) {
                        unsafeWin[request.wrapper].Memory = this.Memory;
                        response = unsafeWin[request.wrapper]
                                [request.arg1](request);
                    } else {
                        debug.error(request.wrapper.request.arg1 +
                            " function does not exist",
                            this._document.location.href);
                    }
                } else {
                    debug.error(request.wrapper +
                            " wrapper does not exist",
                            this._document.location.href);
                }
                break;

            default:
                debug.error("Unexpected request from Poly",
                    this._document.location.href);
        }
        if (response != null && typeof(response.toString) != undefined) {
            return response.toString();
        } else {
            return response;
        }
    },

    init : function(doc, s, c) {
        this._document = doc;
        this.socket1 = s;
        this.console = c;
        debug = Cc["@ed.ac.uk/poly/debug-console;1"]
                .getService().wrappedJSObject;
        this.nativeJSON = Cc["@mozilla.org/dom/json;1"]
                .createInstance(Ci.nsIJSON),
        this.listeners = {};
        this.timers = [];
        this.Memory = new Memory();
        this.DOMWrappers = new DOMWrappers(this.Memory);
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

