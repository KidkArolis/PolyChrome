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
        if ( file.exists() == false || file.isDirectory()) {
            return null;
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
        dump(binpath);
        process.init(file);
        process.run(false, args, args.length);
        return process;
    },
    
    getExtensionPath : function() {
        var path1 = Utils.getProfilePath() +
                'extensions/polymlext@ed.ac.uk';  
        //polymlext@ed.ac.uk is a file when developing and a directory
        //when installed as an xpi extension
        var path2 = Utils.readFile(path1);
        if (path2==null) {
            return path1.substr(0, path1.length-1);
        } else {
            return path2.substr(0, path2.length-1);
        }
    }
}

