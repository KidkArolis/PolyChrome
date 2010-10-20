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
        this.listeners = {};
        this.timers = {};
    }
}

function DOMWrappers (memory, socket) {
    this.Memory = memory;
    this.socket = socket;
}
DOMWrappers.prototype = {
    getElementById : function(request) {
        var elem = document.getElementById(request.arg1);
        return this.Memory.addReference(elem);
    },
    getElementsByTagName: function(request) {
        var elems = document.getElementsByTagName(request.arg1);
        var response = "[";
        for (var i=0, len=elems.length; i<len; i++) {
            response += "\""+this.Memory.addReference(elems[i])+"\",";
        }
        response = response.substr(0, response.length-1)+"]";
        return response;
    },
    childNodes: function(request) {
        var elem = this.Memory.getReference(request.arg1);
        var elems = elem.childNodes;
        var response = "[";
        for (var i=0, len=elems.length; i<len; i++) {
            response += "\""+this.Memory.addReference(elems[i])+"\",";
        }
        response = response.substr(0, response.length-1)+"]";
        return response;
    },
    parentNode: function(request) {
        var elem = this.Memory.getReference(request.arg1);
        return this.Memory.addReference(elem.parentNode);
    },
    firstChild: function(request) {
        var elem = this.Memory.getReference(request.arg1);
        return this.Memory.addReference(elem.firstChild);
    },
    lastChild: function(request) {
        var elem = this.Memory.getReference(request.arg1);
        return this.Memory.addReference(elem.lastChild);
    },
    nextSibling: function(request) {
        var elem = this.Memory.getReference(request.arg1);
        return this.Memory.addReference(elem.nextSibling);
    },
    previousSibling: function(request) {
        var elem = this.Memory.getReference(request.arg1);
        return this.Memory.addReference(elem.previousSibling);
    },
    innerHTML: function(request) {
        var elem = this.Memory.getReference(request.arg1);
        if (elem&&elem.innerHTML!=null) {
            if (request.arg2) {
                elem.innerHTML = request.arg2;
                return "";
            } else {
                return elem.innerHTML;
            }
        } else {
            return "exception";
        }
    },
    value: function(request) {
        var elem = this.Memory.getReference(request.arg1);
        if (elem&&elem.value!=null) {
            if (request.arg2) {
                elem.value = request.arg2;
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
        var elem = this.Memory.getReference(request.arg1);
        return elem.getAttribute(request.arg2);
    },
    setAttribute: function(request) {
        var elem = this.Memory.getReference(request.arg1);
        return elem.setAttribute(request.arg2, request.arg3);
    },
    removeAttribute: function(request) {
        var elem = this.Memory.getReference(request.arg1);
        return elem.removeAttribute(request.arg2);
    },
    createElement: function(request) {
        var elem = document.createElement(request.arg1);
        return this.Memory.addReference(elem);
    },
    createTextNode: function(request) {
        var elem = document.createTextNode(request.arg1);
        return this.Memory.addReference(elem);
    },
    appendChild: function(request) {
        var parent = this.Memory.getReference(request.arg1);
        var child = this.Memory.getReference(request.arg2);
        this.parent.appendChild(child);
    },
    removeChild: function(request) {
        var parent = this.Memory.getReference(request.arg1);
        var child = this.Memory.getReference(request.arg2);
        this.parent.removeChild(child);
    },
    replaceChild: function(request) {
        var parent = this.Memory.getReference(request.arg1);
        var child_new = this.Memory.getReference(request.arg2);                   
        var child_old = this.Memory.getReference(request.arg3);
        this.parent.replaceChild(child_new, child_old);
    },
    style: function(request) {
        var elem = this.Memory.getReference(request.arg1);
        if (elem.style == undefined) {
            return "exception";
        }
        if (request.arg3) {
            elem.style[request.arg2] = request.arg3;
            return "";
        } else {
            return elem.style[request.arg2];
        }
    },
    
    //events
    addEventListener : function(request) {
        var elem = this.Memory.getReference(request.arg1);
        var socket = this.socket;
        this.Memory.listeners[request.arg3] = function(event) {
            var data = "";
            if (request.arg4!=undefined) {
                for (i=0, len=request.arg4.length; i<len; i++) {
                    data += event[request.arg4[i]]+",";
                }
            }
            var cmd = 'val _ = handle_event "'+request.arg3+'" "'+data+'"';
            socket.send(cmd);
        }
        elem.addEventListener(
            request.arg2,
            this.Memory.listeners[request.arg3],
            false
        );
    },
    removeEventListener : function(request) {
        var elem = this.Memory.getReference(request.arg1);
        elem.removeEventListener(
            request.arg2,
            this.Memory.listeners[request.arg3],
            false
        );
        delete this.Memory.listeners[request.arg3];
    },
    //an example of a custom event function
    onMouseMove : function(request) {
        request.arg4 = ["clientX", "clientY"];
        this.addEventListener(request);
    },
    
    //timers
    setInterval : function(request) {
        var socket = this.socket;
        var f = function() {
            var cmd = 'val _ = handle_timer "'+request.arg2+'"';
            socket.send(cmd);
        }
        var id = document.defaultView.wrappedJSObject.setInterval(
            f,
            parseInt(request.arg1)
        );
        this.Memory.timers[request.arg2] = id;
    },
    clearInterval : function(request) {
        document.defaultView.wrappedJSObject.clearInterval(
            this.Memory.timers[request.arg1]
        );
        delete this.Memory.timers[request.arg1];
    },

    //Memory management
    clearMemory: function(request) {
        if (!request.arg1) {
            request.arg1 = null;
        }
        this.Memory.clearMemory(request.arg1);
    },
    switchNamespace: function(request) {
        if (!request.arg1) {
            request.arg1 = null;
        }
        this.Memory.switchNamespace(request.arg1);
    },
    removeReference: function(request) {
        this.Memory.removeReference(request.arg1);
    },
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

            case 2: //DOM function
                if (this.DOMWrappers[request.f] != undefined) {
                    response = this.DOMWrappers[request.f](request);
                    //if the wrapper does not return anything, set the
                    //response to null
                    if (response == undefined) {
                        response = null;
                    }
                } else {
                    debug.error(request.f + " is not implemented",
                            this._document.location.href);
                }
                break;
            
            case 3: //custom wrappers
                var unsafeWin = document.defaultView.wrappedJSObject;
                
                if (unsafeWin[request.w] == undefined) {
                    debug.error(request.w +
                            " wrapper does not exist",
                            this._document.location.href);
                    break;
                }
                
                if (unsafeWin[request.w][request.f] == undefined) {
                    debug.error(request.w+"."+request.f +
                        " function does not exist",
                        this._document.location.href);
                    break;
                }
                
                unsafeWin[request.w].Memory = this.Memory;
                response = unsafeWin[request.w][request.f](request);
                break;

            default:
                debug.error("Unexpected request from Poly",
                    this._document.location.href);
        }
        
        if (response != null
            && response != undefined
            && typeof(response.toString) != undefined) {
                return response.toString();
        } else {
            return response;
        }
    },

    init : function(doc, s, c) {
        debug = Cc["@ed.ac.uk/poly/debug-console;1"]
                .getService().wrappedJSObject;
        
        this._document = doc;
        this.socket = s;
        this.console = c;
        
        this.nativeJSON = Cc["@mozilla.org/dom/json;1"]
                .createInstance(Ci.nsIJSON),

        this.Memory = new Memory();
        this.DOMWrappers = new DOMWrappers(this.Memory, this.socket);
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

