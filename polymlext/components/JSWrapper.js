const Cc = Components.classes;
const Ci = Components.interfaces;
const Cr = Components.results;

var debug;

var document;

function Memory() {
    this.init();
}
Memory.prototype = {
    addReference : function(element) {
        if (element==null) {
            return "null";
        } else {
            this.elements[this.currentNamespace].push(element);
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
        var element = document.getElementById(request.arg1);
        return this.Memory.addReference(element);
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
        var element = this.Memory.getReference(request.arg1);
        var elems = element.childNodes;
        var response = "[";
        for (var i=0, len=elems.length; i<len; i++) {
            response += "\""+this.Memory.addReference(elems[i])+"\",";
        }
        response = response.substr(0, response.length-1)+"]";
        return response;
    },
    parentNode: function(request) {
        var element = this.Memory.getReference(request.arg1);
        return this.Memory.addReference(element.parentNode);
    },
    firstChild: function(request) {
        var element = this.Memory.getReference(request.arg1);
        return this.Memory.addReference(element.firstChild);
    },
    lastChild: function(request) {
        var element = this.Memory.getReference(request.arg1);
        return this.Memory.addReference(element.lastChild);
    },
    nextSibling: function(request) {
        var element = this.Memory.getReference(request.arg1);
        return this.Memory.addReference(element.nextSibling);
    },
    previousSibling: function(request) {
        var element = this.Memory.getReference(request.arg1);
        return this.Memory.addReference(element.previousSibling);
    },
    /*
    innerHTML: function(request) {
        var element = this.Memory.getReference(request.arg1);
        if (request.arg2) {
            element.innerHTML = request.arg2;
            return "";
        } else {
            return element.innerHTML;
        }
    },
    */
    getInnerHTML: function(request) {
        var element = this.Memory.getReference(request.arg1);
        return element.innerHTML;
    },
    setInnerHTML: function(request) {
        var element = this.Memory.getReference(request.arg1);
        element.innerHTML = request.arg2;
        return null;
    },
    /*
    value: function(request) {
        var element = this.Memory.getReference(request.arg1);
        if (request.arg2) {
            element.value = request.arg2;
            return "";
        } else {
            return element.value;
        }
    },
    */
    getValue: function(request) {
        var element = this.Memory.getReference(request.arg1);
        return element.value;
    },
    setValue: function(request) {
        element.value = request.arg2;
        return null;
    },
    getAttribute: function(request) {
        var element = this.Memory.getReference(request.arg1);
        return element.getAttribute(request.arg2);
    },
    setAttribute: function(request) {
        var element = this.Memory.getReference(request.arg1);
        return element.setAttribute(request.arg2, request.arg3);
    },
    removeAttribute: function(request) {
        var element = this.Memory.getReference(request.arg1);
        return element.removeAttribute(request.arg2);
    },
    createElement: function(request) {
        var element = document.createElement(request.arg1);
        return this.Memory.addReference(element);
    },
    createTextNode: function(request) {
        var element = document.createTextNode(request.arg1);
        return this.Memory.addReference(element);
    },
    appendChild: function(request) {
        var parent = this.Memory.getReference(request.arg1);
        var child = this.Memory.getReference(request.arg2);
        this.parent.appendChild(child);
        return null;
    },
    removeChild: function(request) {
        var parent = this.Memory.getReference(request.arg1);
        var child = this.Memory.getReference(request.arg2);
        this.parent.removeChild(child);
        return null;
    },
    replaceChild: function(request) {
        var parent = this.Memory.getReference(request.arg1);
        var child_new = this.Memory.getReference(request.arg2);                   
        var child_old = this.Memory.getReference(request.arg3);
        this.parent.replaceChild(child_new, child_old);
        return null;
    },
    /*
    style: function(request) {
        var element = this.Memory.getReference(request.arg1);
        if (request.arg3) {
            element.style[request.arg2] = request.arg3;
            return "";
        } else {
            return element.style[request.arg2];
        }
    },
    */
    getStyle: function(request) {
        var element = this.Memory.getReference(request.arg1);
        return element.style[request.arg2];
    },
    setStyle: function(request) {
        element.style[request.arg2] = request.arg3;
        return null;
    },
    
    //events
    addEventListener : function(request) {
        var element = this.Memory.getReference(request.arg1);
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
        element.addEventListener(
            request.arg2,
            this.Memory.listeners[request.arg3],
            false
        );
        return null;
    },
    removeEventListener : function(request) {
        var element = this.Memory.getReference(request.arg1);
        element.removeEventListener(
            request.arg2,
            this.Memory.listeners[request.arg3],
            false
        );
        delete this.Memory.listeners[request.arg3];
        return null;
    },
    //an example of a custom event function
    onMouseMove : function(request) {
        request.arg4 = ["clientX", "clientY"];
        this.addEventListener(request);
        return null;
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
        return null;
    },
    clearInterval : function(request) {
        document.defaultView.wrappedJSObject.clearInterval(
            this.Memory.timers[request.arg1]
        );
        delete this.Memory.timers[request.arg1];
        return null;
    },

    //Memory management
    clearMemory: function(request) {
        if (!request.arg1) {
            request.arg1 = null;
        }
        this.Memory.clearMemory(request.arg1);
        return null;
    },
    switchNamespace: function(request) {
        if (!request.arg1) {
            request.arg1 = null;
        }
        this.Memory.switchNamespace(request.arg1);
        return null;
    },
    removeReference: function(request) {
        this.Memory.removeReference(request.arg1);
        return null;
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
                this.console.log(request.output + "\n");
                break;

            case 2: //DOM function
                if (this.DOMWrappers[request.f] != undefined) {
                    try {
                        response = this.DOMWrappers[request.f](request);
                        if (response === undefined) {
                            throw "undefined";
                        }
                    } catch (e) {
                        /*
                        var vDebug = ""; 
                        for (var prop in e) 
                        {  
                           vDebug += "property: "+ prop+ " value: ["+ e[prop]+ "]\n"; 
                        } 
                        vDebug += "toString(): " + " value: [" + e.toString() + "]"; 
                        debug.log(vDebug);
                        */
                        
                        response = {type:"exn", id:1, message:e};
                    }
                } else {
                    debug.error(request.f + " is not implemented",
                            this._document.location.href);
                }
                break;
            
            case 3: //custom wrappers
                var unsafeWin = document.defaultView.wrappedJSObject;
                
                //TODO: perhaps these are not needed with the auto
                //exception handling
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
                try {
                    response = unsafeWin[request.w][request.f](request);
                    if (response === undefined) {
                        throw "undefined";
                    }
                } catch (e) {
                    response = {type:"exn", id:1, message:e};
                }
                break;

            default:
                debug.error("Unexpected request from Poly",
                    this._document.location.href);
        }
        
        if (response != null
            && typeof(response.toString) != undefined
            && typeof(response) != 'object') {
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

