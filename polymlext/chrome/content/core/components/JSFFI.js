(function() {
    
var log = PolyMLext.log;
var error = PolyMLext.error;

//this will be set to a document, so that all DOM/JS wrappers could access
//the correct document (and not firefox UI)
var document;
var unsafeWin;

PolyMLext.JSFFI = function(poly) {
    this.poly = poly;
    this.nativeJSON = Cc["@mozilla.org/dom/json;1"]
            .createInstance(Ci.nsIJSON);
    this.Memory = new Memory(this.poly);
}
PolyMLext.JSFFI.prototype = {
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
                            " File:" + e.fileName + "Stack: " + e.stack;
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
                    response = this.Memory[request.f](request.arg1);
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
                    error(e.message + " Line: " + e.lineNumber +
                            " File:" + e.fileName);
                }
                break;

            default:
                error("Unexpected request from Poly", document.location.href);
        }
        
        //TODO: not sure this is needed
        //if (responsePacket.message && responsePacket.message.toString) {
        //    responsePacket.message = responsePacket.message.toString();
        //}
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
        //e.g. convert "obj1.obj2.obj3.fun" into ["obj1", "obj2", "obj3", "fun"]
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
                var returnValue = obj[field].apply(obj, args);
                break;
            case 3:
                //if no arguments provided return the value of the attribute
                //otherwise set the value of the attribute
                var args = this.convertArgsFromPoly(request.args);
                switch (args.length) {
                    case 0:
                        var returnValue = obj[field];
                        break;
                    case 1:
                        obj[field] = args[0];
                        return null;
                        break;
                    default:
                        throw "Unexpected request. Too many arguments."
                }
                break;
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
                break;
            case "function":
            case "object":
                items = this.Memory.addReference(items);
                break;
            case "array":
                items = items.map(this.convertTypesToPoly, this);
        }
        return items;
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
                //literal value
                default:
                    args.push(arg);
            }
        }
        return args;
    },
    
    destroy : function() {}
}

var Memory = function(poly) {
    this.references = {"":{}};
    //the empty string indicates the main namespace.
    //this namespace can not be deleted
    this.currentNs = "";
    //this counter is currently used for generating the ids in the Memory
    this.counter = 0;
    this.poly = poly;
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
    convertTypesToPoly : function(items) {
        switch (typeof(items)) {
            case null:
                break;
            case "function":
            case "object":
                items = this.addReference(items);
                break;
            case "array":
                items = items.map(this.convertTypesToPoly, this);
        }
        return items;
    },
    
    parse_id : function(reference) {
        var y = reference.split("|");
        return {idx:y[0], ns: y[1]};
    },
    create_id : function(idx, ns) {
        return (idx + "|" + ns);
    },
    addFunctionReference : function(callback) {
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
                    var carg = self.convertTypesToPoly(arguments[argi++]);
                    if (typeof(carg)=="string") {
                        carg = '"'+carg+'"'
                    }
                    cmd += carg + ' ';
                } else {
                    cmd += callback[i] + ' ';
                }
            }
            //TODO hack..
            cmd = cmd.replace(/-/g, "~");
            self.poly.sendCode(cmd);
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

}());