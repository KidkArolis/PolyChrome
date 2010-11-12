PolyMLext.DebugConsole = function() {
    this.consoleService = Cc["@mozilla.org/consoleservice;1"]
            .getService(Components.interfaces.nsIConsoleService);
}
PolyMLext.DebugConsole.prototype = {
    
    profilingData : [],
    
    log : function(m, p) {
        if (typeof(m)=="object") {
            m = Utils.objToStr(m);
        }
        var prefix = p==null ? "" : p;
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
    
    profile : function(message) {
        this.profilingData.push({
            timestamp: new Date().getTime(),
            message: message
        });
    },
    
    writeProfilingReport : function() {
        var report = "";
        var prev = this.profilingData[0].timestamp;
        for (var i in this.profilingData) {
            var item = this.profilingData[i];
            var diff = item.timestamp - prev;
            prev = item.timestamp;
            report += diff + "ms " + item.message + "\n";
        }
        this.log("Profile:")
        this.log(report);
        
        this.profilingData = [];
    }
};
