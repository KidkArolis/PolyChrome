var EXPORTED_SYMBOLS = ["Utils"];

var Utils = {
    getProfilePath : function() {
        var fileLocator = Components.classes["@mozilla.org/file/directory_service;1"]
                .getService(Components.interfaces.nsIProperties);
        var path = escape(fileLocator.get("ProfD", Components.interfaces.nsIFile).path.replace(/\\/g, "/")) + "/";
        if (path.indexOf("/") != 0) {
            path = '/' + path;
        }
        return path;
    },

    readFile : function(filename) {
        var file = Components.classes["@mozilla.org/file/local;1"]
	        .createInstance(Components.interfaces.nsILocalFile);
        file.initWithPath(filename);
        if ( file.exists() == false ) {
	        console.log("File does not exist", "error");
        }
        var is = Components.classes["@mozilla.org/network/file-input-stream;1"]
	        .createInstance( Components.interfaces.nsIFileInputStream );
        is.init( file,0x01, 00004, null);
        var sis = Components.classes["@mozilla.org/scriptableinputstream;1"]
	        .createInstance( Components.interfaces.nsIScriptableInputStream );
        sis.init( is );
        var output = sis.read( sis.available() );
        return output;
    },

    startProcess : function(binpath, args) {
        var file = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
        file.initWithPath(binpath);
        var process = Components.classes["@mozilla.org/process/util;1"].createInstance(Components.interfaces.nsIProcess);
        process.init(file);
        process.run(false, args, args.length);
        return process;
    }
}

