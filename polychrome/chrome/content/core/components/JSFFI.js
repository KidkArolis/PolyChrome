(function() {
    
var log = PolyChrome.log;
var error = PolyChrome.error;

PolyChrome.JSFFI = function(poly) {
    this.poly = poly;
    this.nativeJSON = Cc["@mozilla.org/dom/json;1"]
            .createInstance(Ci.nsIJSON);
    this.Memory = new Memory(this.poly);

}
PolyChrome.JSFFI.prototype = {
    process : function(req) {
        var response = null;
        var responsePacket = {};
        
        //parse the JSON request
        try {
            var request = this.nativeJSON.decode(req);
        } catch (e) {
            error("Could not decode JSON.\nRequest:\n"+req+"\n",
                    this.poly.document.location.href);
            return responsePacket;
        }
        
        switch (request.type) {
            case 0: //output
                this.poly.console.log(request.output);
                break;

            case 1: //errors
                this.poly.console.error(request.output + "\n");
                break;
            
            case 2: //JS function
            case 3: //setting/getting attributes of JS objects
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
                    var errorMsg = "";
                    if (typeof(e)=="string") {
                        errorMsg = e;
                    } else {
                        errorMsg = e.message + " Line: " + e.lineNumber +
                            " File:" + e.fileName;
                    }
                    errorMsg += ", while trying to call " + request.f
                    responsePacket = {
                        type:"exception",
                        message:errorMsg,
                        ret:request.r
                    };
                }
                break;
            
            case 4: //Memory management
                try {
                    response = this.Memory[request.f](request.arg1, request.arg2);
                    responsePacket = {
                        type:"success",
                        message:response,
                        ret:request.r
                    };
                } catch (e) {
                    var errorMsg = "";
                    if (typeof(e)=="string") {
                        errorMsg = e;
                    } else {
                        errorMsg = e.message + " Line: " + e.lineNumber +
                            " File:" + e.fileName;
                    }
                    errorMsg += ", while trying to call " + request.f
                    responsePacket = {
                        type:"exception",
                        message:errorMsg,
                        ret:request.r
                    };
                }
                break;
            
            case 5: //ready for more callbacks signal
                this.Memory.dispatchNextCallback();
                break;

            default:
                error("Unexpected request from Poly", this.poly.document.location.href);
        }
        
        return responsePacket;
    },
    
    executeJS : function(request) {
        var returnValue;
        var obj = this.Memory.getReference(request.obj);
        //convert "obj1.obj2.obj3.fun" into ["obj1", "obj2", "obj3", "fun"]
        var f = request.f.split(".");
        //redefine obj in a loop and then set the field
        //obj = obj["obj1"];
        //obj = obj["obj2"];
        //obj = obj["obj3"];
        //this is equivalent to obj = obj.obj1.obj2.obj3; field = "fun"
        for (var i=0, len=f.length-1; i<len; i++) {
            obj = obj[f[i]];
        }
        var field = f[f.length-1];
        switch(request.type) {
            case 2:
                var args = this.convertArgsFromPoly(request.args);
                if (field != "") {
                    returnValue = obj[field].apply(obj, args);
                } else {
                    returnValue = obj.apply(null, args);
                }
                break;
            case 3:
                //if no arguments provided return the value of the attribute
                //otherwise set the value of the attribute
                var args = this.convertArgsFromPoly(request.args);
                switch (args.length) {
                    case 0:
                        returnValue = obj[field];
                        break;
                    case 1:
                        obj[field] = args[0];
                        break;
                    default:
                        throw "Unexpected request. Too many arguments."
                }
                break;
        }
        //return smth only if we have to
        if (request.r) {
            return this.convertTypesToPoly(returnValue);
        } else {
            return null;
        }
    },
    
    /**
     * This function is used to convert the returned value of a JavaScript
     * function call into a value compatible with Poly. Note, however, that
     * all of these values reach Poly as strings, so it is up to the
     * jsffi.exec_js... caller to convert the types.
     */
    convertTypesToPoly : function(item) {
        switch (typeof(item)) {
            case null:
                break;
            case "number":
                item = (item+"").replace(/-/g, "~");
                break;
            case "function":
            case "object":
                item = this.Memory.addReference(item);
                break;
        }
        return item;
    },
    
    /**
     * Poly sends arguments to JavaScript functions in tuples
     * (argument:string, type:string). This function converts the first item
     * of the tuple into an appropriate JavaScript object
     */
    convertArgsFromPoly : function(items) {
        var args = [];
        for (var i in items) {
            var arg = items[i][0];
            var type = items[i][1];
            switch (type) {
                case "reference":
                    args.push(this.Memory.getReference(arg));
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



/*
    The references are identified by an integer index and a string name
    of a namespace, i.e. idx|namespace. This means namespace names can't
    contain character |. Namespace names also can't contain comma (,)
    because lists of elements are tokenized by comma.

    Term 'reference' is used here to describe both the string identifier
    of the reference and the JavaScript reference (pointer). That is done
    for the exception handling. e.g. exceptions raised here will produce
    more readable messages like "TypeError: reference is undefined"
*/
var Memory = function(poly) {
    this.poly = poly;
    this.references = {};
    this.clearDefaultNs();
    //the empty string indicates the main namespace.
    //this namespace can not be deleted
    this.currentNs = "";
    //this counter is currently used for generating the ids in the Memory
    this.counter = 0;
    
    this.polyReady = true;
    this.callbackQueue = [];
}
Memory.prototype = {    
    parse_id : function(reference) {
        var y = reference.split("|");
        return {idx:y[0], ns: y[1]};
    },
    
    create_id : function(idx, ns) {
        return (idx + "|" + ns);
    },
    
    /**
     * This is very similar to convertTypesToPoly, however this also
     * wraps certain things with quotes, because these are intended to be
     * arguments to functions
     */
    convertArgsToPoly : function(item) {
        switch (typeof(item)) {
            case null:
                break;
            case "number":
                item = (item+"").replace(/-/g, "~");
                break;
            case "string":
                item = '"'+item+'"';
                break;
            case "function":
            case "object":
                item = '"'+this.addReference(item)+'"';
                break;
        }
        return item;
    },
    
    addFunctionReference : function(callback, overwritable) {
        var self = this;
        //create a dummy reference to get the id
        var id = this.addReference(function() {});
        callback = callback.split(" ");
        var f = function() {
            //replace all occurences of "{arg}" with the actual
            //arguments that this function was called with;
            //those arguments are found in the arguments variable
            var cmd = "";
            var argi = 0;
            for (var i in callback) {
                if (callback[i]=="{id}") {
                    cmd += '"' + id + '" ';
                } else if (callback[i]=="{arg}") {
                    var carg = self.convertArgsToPoly(arguments[argi++]);
                    cmd += carg + ' ';
                } else {
                    cmd += callback[i] + ' ';
                }
            }
            self.dispatchCallback(callback, cmd, overwritable);
        }
        this.replaceReference(id, f);
        return id;
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
    
    replaceReference : function(id, reference) {
        var y = this.parse_id(id);
        this.references[y.ns][y.idx] = reference;
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
        //set document and window references
        this.references[""] = {};
        this.references[""]["document"] = this.poly.document;
        this.references[""]["window"] = this.poly.document.defaultView.wrappedJSObject;
    },
    
    clearNs : function(ns) {
        if (ns=="") {
            this.clearDefaultNs();
        }
        this.references[ns] = {};
    },
    
    deleteNs : function(ns) {
        if (ns=="") throw "Can't delete the default namespace";
        delete this.references[ns];
    },
    
    dispatchCallback : function(original_cmd, cmd, overwritable) {
        if (this.polyReady) {
            this.polyReady = false;
            this.poly.sendCode(cmd);
        } else {
            if (overwritable && this.callbackQueue.length>0) {
                var lastIdx = this.callbackQueue.length-1;
                if (this.callbackQueue[lastIdx][0] == original_cmd) {
                    this.callbackQueue[lastIdx] = [original_cmd, cmd];
                } else {
                    this.callbackQueue.push([original_cmd, cmd]);
                }
            } else {
                this.callbackQueue.push([original_cmd, cmd]);
            }
        }
    },
    
    dispatchNextCallback : function() {
        if (this.callbackQueue.length==0) {
            this.polyReady = true;
        } else {
            var cmd = this.callbackQueue.shift();
            this.poly.sendCode(cmd[1]);
        }
    },
    
    destroy : function() {}
}

}());