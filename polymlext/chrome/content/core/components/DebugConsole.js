PolyMLext.DebugConsole = function() {
    this.consoleService = Cc["@mozilla.org/consoleservice;1"]
            .getService(Components.interfaces.nsIConsoleService);
}
PolyMLext.DebugConsole.prototype = {
    log : function(m, p) {
        if (typeof(m)=="object") {
            m = this.objToStr(m);
        }
        var prefix = p==null ? "INFO" : p;
        this.consoleService.logStringMessage(prefix + ": " + m + "\n");
    },
    
    error : function(m, source) {
        var scriptError = Components.classes["@mozilla.org/scripterror;1"]
                .createInstance(Components.interfaces.nsIScriptError);
        var aSourceName = source;
        var aSourceLine = "";
        var aLineNumber = "";
        var aColumnNumber = "";
        var aFlags = 0x0;
        var aCategory = "";
        scriptError.init(m, aSourceName, aSourceLine, aLineNumber, 
               aColumnNumber, aFlags, aCategory);
        this.consoleService.logMessage(scriptError);
    },
    
    
    objToStr : function(obj) {
        var objstr = "{\n"; 
        for (var prop in obj) {
            var value = obj[prop];
            if (typeof(value)=="object") {
                //value = "  " + this.objToStr(value);
            }
            objstr += "  " + prop + ": " + value + "\n";
        } 
        objstr += "} = "+ obj.toString();
        return objstr;
    }
};