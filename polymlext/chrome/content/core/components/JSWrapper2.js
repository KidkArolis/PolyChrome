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
    this.MemoryWrappers = new MemoryWrappers(this.Memory, this.poly);
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

            case 2: //JS function
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
            
            case 3: //Memory management
                try {
                    response = this.Memory[request.f](request.arg1);
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
        //e.g. convert "Array.prototype.split" into ["Array", "prototype", "split"]
        var f = request.f.split(".");
        //TODO this is a bad example (cause it doens't work)
        //incrementally define obj and then set the field
        //obj = obj["Array"];
        //obj = obj["prototype"];
        //this is equivalent to obj = obj.Array.prototype; field = "split"
        for (var i=0, len=f.length-1; i<len; i++) {
            obj = obj[f[i]];
        }
        var field = f[f.length-1];
        switch (typeof(obj[field])) {
            case "undefined":
                break;
            case "function":
                var args = this.convertArgsFromPoly(request.args);
                var returnValue = obj[field].apply(obj, args);
                break;
            //other attribute
            default:
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
                items = items.map(this.convertType, this);
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
                case "callback":
                    var self = this;
                    //closure magic, we attach a new name to this value
                    //so that the callback could find it later
                    //however this WILL fail if there are more than one callback
                    //in this same for loop..
                    //TODO: fix that
                    var callback_id = arg;
                    this.Memory.listeners[arg] = function(event) {
                        var event_id = self.Memory.addReference(event);
                        var cmd = 'val _ = DOM.handle_event "'+callback_id+'" "'+event_id+'"';
                        self.poly.sendCode("0"+cmd);
                    }
                    args.push(this.Memory.listeners[arg]);
                    break;
                case "existing_callback":
                    args.push(this.Memory.listeners[arg]);
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

}());






    /*
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
    */