const Cc = Components.classes;
const Ci = Components.interfaces;
const Cr = Components.results;

var debug;

var document;

function Memory() {
    this.init();
}
Memory.prototype = {
    
    /*
        The references are identified by an integer index and a string name
        of a namespace, i.e. idx|namespace. This means namespace names can't
        contain character |. Namespace names also can't contain comma (,)
        because lists of elements are tokenized by comma.
    */
    
    /*
        Term 'reference' is used here to describe both the string identifier
        of the reference and the JavaScript reference (pointer). That is done
        for the exception handling. e.g. exceptions raised here will produce
        more readable messages like "TypeError: reference is undefined"
    */
    
    parse_id : function(reference) {
        var y = reference.split("|");
        return {idx:y[0], ns: y[1]};
    },
    create_id : function(idx, ns) {
        return (idx + "|" + ns);
    },
    
    addReference : function(reference) {
        if (reference==null) {
            //this will be converted to "NONE: string option"
            return "null";
        } else {
            this.references[this.currentNs][this.counter] = reference;
            //return the index of the reference and increment the index
            return this.create_id(this.counter++, this.currentNs)
        }
    },
    getReference : function(reference) {
        var y = this.parse_id(reference);
        if (this.references[y.ns]===undefined) throw "namespace " + y.ns + " undefined";
        var ref = this.references[y.ns][y.idx];
        if (ref===undefined) throw "reference undefined";
        return ref;
    },
    removeReference : function(reference) {
        var y = this.parse_id(reference);
        delete this.references[y.ns][y.idx];
    },
    
    switchDefaultNs : function() {
        this.currentNs = "";
    },
    switchNs : function(ns) {
        //create new namespace if it doesn't exist yet
        if (!this.references[ns]) {
            this.references[ns] = {};
        }
        this.currentNs = ns;
    },
    clearDefaultNs : function() {
        this.references[""] = {};
    },
    clearNs : function(ns) {
        this.references[ns] = {};
    },
    deleteNs : function(ns) {
        delete this.references[ns];
    },
    
    init : function() {
        this.references = {"":{}};
        //the empty string indicates the main namespace.
        //this namespace can not be deleted
        this.currentNs = "";
        this.listeners = {};
        this.timers = {};
        this.counter = 0;
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
        var response = "";
        for (var i=0, len=elems.length; i<len; i++) {
            response += this.Memory.addReference(elems[i])+",";
        }
        response = response.substr(0, response.length-1);
        return response;
    },
    childNodes: function(request) {
        var element = this.Memory.getReference(request.arg1);
        var elems = element.childNodes;
        var response = "";
        for (var i=0, len=elems.length; i<len; i++) {
            response += this.Memory.addReference(elems[i])+",";
        }
        response = response.substr(0, response.length-1);
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

    getInnerHTML: function(request) {
        var element = this.Memory.getReference(request.arg1);
        return element.innerHTML;
    },
    setInnerHTML: function(request) {
        var element = this.Memory.getReference(request.arg1);
        element.innerHTML = request.arg2;
        return null;
    },
    getValue: function(request) {
        var element = this.Memory.getReference(request.arg1);
        return element.value;
    },
    setValue: function(request) {
        var element = this.Memory.getReference(request.arg1);
        element.value = request.arg2;
        return null;
    },
    getAttribute: function(request) {
        var element = this.Memory.getReference(request.arg1);
        return element.getAttribute(request.arg2);
    },
    setAttribute: function(request) {
        var element = this.Memory.getReference(request.arg1);
        element.setAttribute(request.arg2, request.arg3);
        return null;
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
    getStyle: function(request) {
        var element = this.Memory.getReference(request.arg1);
        return element.style[request.arg2];
    },
    setStyle: function(request) {
        var element = this.Memory.getReference(request.arg1);
        element.style[request.arg2] = request.arg3;
        return null;
    },
    
    //events
    addEventListener : function(request) {
        var element = this.Memory.getReference(request.arg1);
        var socket = this.socket;
        
        this.Memory.listeners[request.arg3] = function(event) {
            var data = "";
            if (request.arg4!==undefined) {
                for (i=0, len=request.arg4.length; i<len; i++) {
                    data += event[request.arg4[i]]+",";
                }
            }
            var cmd = 'val _ = handle_event "'+request.arg3+'" "'+data+'"';
            socket.send("0"+cmd);
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
    //polling mouse coordinates
    getMouseCoords : function(request) {
        if (this.mouseX === undefined) {
            this.mouseX = 0;
            this.mouseY = 0;       
            
            self = this;
            var unsafeWin = document.defaultView.wrappedJSObject;
            var setCoords = function(event) {
                unsafeWin.removeEventListener('mousemove', setCoords, false)
                self.mouseX = event.clientX;
                self.mouseY = event.clientY;
                self.mouseCoordsTimeout = unsafeWin.setTimeout(poll, 35);
            }
            var poll = function() {
                unsafeWin.addEventListener('mousemove', setCoords, false);
            }
            poll();
        }
        
        return this.mouseX+","+this.mouseY;
    },
    cancelMouseCoordsPolling : function(request) {
        //remove the listener
        //remove the timeout
    },
    
    //timers
    setInterval : function(request) {
        var socket = this.socket;
        var f = function() {
            var cmd = 'val _ = handle_timer "'+request.arg2+'"';
            socket.send("0"+cmd);
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
    removeReference: function(request) {
        this.Memory.removeReference(request.arg1);
        return null;
    },    
    switchDefaultNs : function(request) {
        this.Memory.switchDefaultNs();
        return null;
    },
    switchNs : function(request) {
        this.Memory.switchNs(request.arg1);
        return null;
    },
    clearDefaultNs : function(request) {
        this.Memory.clearDefaultNs();
        return null;
    },
    clearNs : function(request) {
        this.Memory.clearNs(request.arg1);
        return null;
    },
    deleteNs : function(request) {
        this.Memory.deleteNs(request.arg1);
        return null;
    },
}


JSWrapper.prototype = {

    process : function(req) {
        //make document accessible globally in all wrappers
        document = this._document;
        
        var response = null;
        var responsePacket = {};
        
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
                if (this.DOMWrappers[request.f] !== undefined) {
                    try {
                        response = this.DOMWrappers[request.f](request);
                        if (response === undefined) {
                            throw "undefined";
                        }
                        responsePacket = {type:"response", message:response, ret:request.r};
                    } catch (e) {
                        // perhaps some of the debug info could be useful
                        //var vDebug = ""; 
                        //for (var prop in e) {  
                        //   vDebug += "property: "+ prop+ " value: ["+ e[prop]+ "]\n"; 
                        //} 
                        //vDebug += "toString(): " + " value: [" + e.toString() + "]"; 
                        //debug.log(vDebug);
                        responsePacket = {type:"exn", message:e, ret:request.r};
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
                    responsePacket = {type:"response", message:response, ret:request.r};
                } catch (e) {
                    responsePacket = {type:"exn", message:e, ret:request.r};
                }
                break;

            default:
                debug.error("Unexpected request from Poly",
                    this._document.location.href);
        }
        
        return responsePacket;
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

