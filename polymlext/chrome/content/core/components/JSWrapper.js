(function() {
    
var log = PolyMLext.log;
var error = PolyMLext.error;

//this will be set to a document, so that all DOM/JS wrappers could access
//the correct document (and not firefox UI)
var document;
var unsafeWin;

PolyMLext.JSWrapper = function(poly) {
    this.poly = poly;
    this.nativeJSON = Cc["@mozilla.org/dom/json;1"]
            .createInstance(Ci.nsIJSON);
    this.Memory = new Memory();
    this.DOMWrappers = new DOMWrappers(this.Memory, this.poly);
}
PolyMLext.JSWrapper.prototype = {
    process : function(req) {
        //make document accessible globally in all wrappers
        document = this.poly.document;
        unsafeWin = document.defaultView.wrappedJSObject;
        
        var response = null;
        var responsePacket = {};
        
        //parse the JSON request
        try {
            var request = this.nativeJSON.decode(req);
        } catch (e) {
            error("Could not decode JSON.\nRequest:\n"+req+"\n",
                    document.location.href);
        }
        
        switch (request.type) {
            case 0: //output
                this.poly.console.log(request.output);
                break;

            case 1: //errors
                this.poly.console.error(request.output + "\n");
                break;
            
            /*
            case 2: //DOM function
                if (this.DOMWrappers[request.f] !== undefined) {
                    try {
                        response = this.DOMWrappers[request.f](request);
                        if (response === undefined) {
                            throw "undefined";
                        }
                        responsePacket = {
                            type:"response",
                            message:response,
                            ret:request.r
                        };
                    } catch (e) {
                        responsePacket = {
                            type:"exn",
                            message:e,
                            ret:request.r
                        };
                        error(e.message + " Line: " + e.lineNumber +
                                " File:" + e.fileName);
                    }
                } else {
                    error(request.f + " is not implemented",
                            document.location.href);
                }
                break;
            
            case 3: //custom wrappers
                var unsafeWin = document.defaultView.wrappedJSObject;
                
                if (unsafeWin[request.w] == undefined) {
                    var msg = request.w + " JS wrapper was not found";
                    error(msg, document.location.href);
                    this.poly.console.error(msg);
                    break;
                }
                
                if (unsafeWin[request.w][request.f] == undefined) {
                    var msg = request.w + "." + request.f
                            + " JS function was not found";
                    error(msg, document.location.href);
                    this.poly.console.error(msg);
                    break;
                }
                
                unsafeWin[request.w].Memory = this.Memory;
                try {
                    response = unsafeWin[request.w][request.f](request);
                    if (response === undefined) {
                        throw "undefined";
                    }
                    responsePacket = {
                        type:"response",
                        message:response,
                        ret:request.r
                    };
                } catch (e) {
                    responsePacket = {type:"exn", message:e, ret:request.r};
                }
                break;
            */
            
            case 5: //JS function
                try {
                    response = this.executeJS(request);
                    if (response === undefined) {
                        throw "undefined";
                    }
                    responsePacket = {
                        type:"success",
                        message:response,
                        ret:request.r
                    };
                } catch (e) {
                    responsePacket = {
                        type:"exception",
                        message:e,
                        ret:request.r
                    };
                    if (typeof(e)=="string") {
                        error(e);
                    } else {
                        error(e.message + " Line: " + e.lineNumber +
                            " File:" + e.fileName);
                    }
                }
                break;

            default:
                error("Unexpected request from Poly", document.location.href);
        }
        
        return responsePacket;
    },
    
    executeJS : function(request) {
        var obj;
        switch (request.obj) {
            case "window":
                obj = unsafeWin;
                break;
            case "document":
                obj = document;
                break;
            default:
                obj = this.Memory.getReference(request.obj);
        }
        switch (typeof(obj[request.f])) {
            case "undefined":
                break;
            case "function":
                var args = this.convertArgsFromPoly(request.args);
                var returnValue = obj[request.f].apply(null, args);
                break;
            case "object":
                //IMPROVE for now we allow going only one level deep in the object
                //to get/set values
                var args = this.convertArgsFromPoly(request.args);
                switch (args.length) {
                    case 1:
                        var returnValue = obj[request.f][args[0]];
                        break;
                    case 2:
                        obj[request.f][args[0]] = args[1];
                        return null;
                        break;
                    default:
                        throw "Unexpected request. Wrong number of arguments."
                }
                break;
            //other attribute
            default:
                //if no arguments provided return the value of the attribute
                //otherwise set the value of the attribute
                var args = this.convertArgsFromPoly(request.args);
                switch (args.length) {
                    case 0:
                        var returnValue = obj[request.f];
                        break;
                    case 1:
                        obj[request.f] = args[0];
                        return null;
                        break;
                    default:
                        throw "Unexpected request. Wrong number of arguments."
                }
        }
        
        //do we need to return smth?
        if (request.r) {
            return this.convertTypesToPoly(returnValue);
        } else {
            return null;
        }
    },
    
    convertTypesToPoly : function(items) {
        switch (typeof(items)) {
            case null:
                return items;
            case "function":
            case "object":
                return this.Memory.addReference(items);
                break;
            case "array":
                return items.map(this.convertType, this);
            default:
                return items;
        }
    },
    
    convertArgsFromPoly : function(items) {
        var args = [];
        for (var i in items) {
            var arg = items[i][0];
            var type = items[i][1];
            switch (type) {
                case "reference":
                    args.push(this.Memory.getReference(arg));
                    break;
                case "callback":
                    args.push(function(){});
                    break;
                //literal value
                default:
                    args.push(arg);
            }
        }
        return args;
    },
    
    destroy : function() {}
}

var Memory = function() {
    this.references = {"":{}};
    //the empty string indicates the main namespace.
    //this namespace can not be deleted
    this.currentNs = "";
    this.listeners = {};
    this.timers = {};
    this.counter = 0;
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
            //this will be converted to "NONE: string option" in PolyML
            return "null";
        } else {
            this.references[this.currentNs][this.counter] = reference;
            //return the index of the reference and increment the index
            return this.create_id(this.counter++, this.currentNs)
        }
    },
    getReference : function(reference) {
        var y = this.parse_id(reference);
        if (this.references[y.ns]===undefined) {
            throw "namespace " + y.ns + " undefined";
        }
        var ref = this.references[y.ns][y.idx];
        if (ref===undefined) {
            throw "reference undefined";
        }
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
    destroy : function() {}
}

var DOMWrappers = function(memory, poly) {
    this.Memory = memory;
    this.poly = poly;
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
        var poly = this.poly;
        this.Memory.listeners[request.arg3] = {};
        this.Memory.listeners[request.arg3]['e'] = element;
        this.Memory.listeners[request.arg3]['f'] = function(event) {
            var data = '';
            if (request.arg4!==undefined) {
                for (var i=0, len=request.arg4.length; i<len; i++) {
                    data += event[request.arg4[i]]+',';
                }
            }
            var cmd = 'val _ = handle_event "'+request.arg3+'" "'+data+'"';
            poly.sendCode("0"+cmd);
        }
        element.addEventListener(
            request.arg2,
            this.Memory.listeners[request.arg3]['f'],
            false
        );
        return null;
    },
    removeEventListener : function(request) {
        var element = this.Memory.listeners[request.arg2]['e'];
        element.removeEventListener(
            request.arg1,
            this.Memory.listeners[request.arg2]['f'],
            false
        );
        delete this.Memory.listeners[request.arg2];
        return null;
    },
    //an example of a custom event function
    onMouseMove : function(request) {
        request.arg4 = ['clientX', 'clientY'];
        this.addEventListener(request);
        return null;
    },
    //polling mouse coordinates
    getMouseCoords : function(request) {
        this.mouseCoordsPollingActive = true;
        if (this.mouseX === undefined) {
            this.mouseX = 0;
            this.mouseY = 0;
            
            self = this;
            var unsafeWin = document.defaultView.wrappedJSObject;
            this.setCoords = function(event) {
                unsafeWin.removeEventListener("mousemove", self.setCoords,
                        false)
                self.mouseX = event.clientX;
                self.mouseY = event.clientY;
                self.mouseCoordsTimeout = unsafeWin.setTimeout(poll, 35);
            }
            var poll = function() {
                if (self.mouseCoordsPollingActive) {
                    unsafeWin.addEventListener("mousemove", self.setCoords,
                            false);
                }
            }
            poll();
        }
        
        return this.mouseX+","+this.mouseY;
    },
    cancelMouseCoordsPolling : function(request) {
        this.mouseCoordsPollingActive = false;
        var unsafeWin = document.defaultView.wrappedJSObject;
        if (this.mouseCoordsTimeout != null) {
            unsafeWin.clearTimeout(this.mouseCoordsTimeout);
        }
        unsafeWin.removeEventListener("mousemove", this.setCoords, false);
        return null;
    },
    
    //timers
    setInterval : function(request) {
        var poly = this.poly;
        var f = function() {
            var cmd = 'val _ = handle_timer "'+request.arg2+'"';
            poly.sendCode("0"+cmd);
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
    }
}

}());