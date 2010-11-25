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
        var prefix = p==null ? "" : p + ": ";
        this.consoleService.logStringMessage(prefix + m + "\n");
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
    
    profile2 : function(message) {
        this.profilingData.push({
            timestamp: new Date().getTime(),
            message: message
        });
    },
    
    profile : function(m) {},
    
    writeProfilingReport : function() {
        try {
            var report = "";
            for (var i in this.profilingData) {
                var item = this.profilingData[i];
                report += item.timestamp + ";" + item.message + "\n";
            }
            
            var file = Utils.getExtensionPath();
            file.append("profiling");
            file.append("output.txt");
            
            // file is nsIFile, data is a string
            var foStream = Cc["@mozilla.org/network/file-output-stream;1"].
                                     createInstance(Ci.nsIFileOutputStream);
            // use 0x02 | 0x10 to open file for appending.
            foStream.init(file, 0x02 | 0x08 | 0x20, 0666, 0); 
            // write, create, truncate
            var converter = Components.classes["@mozilla.org/intl/converter-output-stream;1"].  
                              createInstance(Components.interfaces.nsIConverterOutputStream);  
            converter.init(foStream, "UTF-8", 0, 0);  
            converter.writeString(report );  
            converter.close();// this closes foStream
            
            this.profilingData = [];
        } catch (e) {
            this.error(e);
        }
    }
};
