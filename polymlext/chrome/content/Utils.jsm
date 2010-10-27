const Cc = Components.classes;
const Ci = Components.interfaces;
const Cr = Components.results;

var debug = Cc["@ed.ac.uk/poly/debug-console;1"]
            .getService().wrappedJSObject;

var EXPORTED_SYMBOLS = ["Utils"];

var Utils = {
    getProfilePath : function() {
        var fileLocator = Components
                .classes["@mozilla.org/file/directory_service;1"]
                .getService(Ci.nsIProperties);
        var path = fileLocator
                .get("ProfD",Ci.nsIFile).path;
        path = escape(path.replace(/\\/g, "/")) + "/";
        if (path.indexOf("/") != 0) {
            path = '/' + path;
        }
        return path;
    },

    readFile : function(filename) {
        var file = Cc["@mozilla.org/file/local;1"]
            .createInstance(Ci.nsILocalFile);
        file.initWithPath(filename);
        if (file.exists() == false || file.isDirectory()) {
            return null;
        }
        var is = Components
                .classes["@mozilla.org/network/file-input-stream;1"]
                .createInstance(Ci.nsIFileInputStream);
        is.init( file,0x01, 00004, null);
        var sis = Cc["@mozilla.org/scriptableinputstream;1"]
                .createInstance(Ci.
                                nsIScriptableInputStream);
        sis.init(is);
        var output = sis.read(sis.available());
        return output;
    },

    startProcess : function(binpath, args, blocking) {
        var file = Cc["@mozilla.org/file/local;1"]
                .createInstance(Ci.nsILocalFile);
        file.initWithPath(binpath);
        var process = Cc["@mozilla.org/process/util;1"]
                .createInstance(Ci.nsIProcess);
        process.init(file);
        process.run(blocking, args, args.length);
        return process;
    },
    
    findPoly : function() {
        var debug = Cc["@ed.ac.uk/poly/debug-console;1"]
                .getService().wrappedJSObject;
        
        //if the user has manually given the path return true
        var prefService = Components
                .classes["@mozilla.org/preferences-service;1"]
                .getService(Ci.nsIPrefBranch)
        var path = prefService.getCharPref(
                "extensions.PolyMLext.PolyMLPath");
        if (path!="") {
            return true;
        }
        
        //otherwise look for the path using a script
        var binpath = Utils.getExtensionPath() + '/poly/bin/findpoly.sh';
        var process = Utils.startProcess(binpath, [], true);
        return (process.exitValue==0)
    },
    
    getExtensionPath : function() {
        var path1 = Utils.getProfilePath() +
                'extensions/polymlext@ed.ac.uk';  
        //polymlext@ed.ac.uk is a file when developing and a directory
        //when installed as an xpi extension
        var path2 = Utils.readFile(path1);
        if (path2==null) {
            return path1;
        } else {
            //if path was read from the file - remove the new line character
            return path2.substr(0, path2.length-1);
        }
    },
    
    isDevelopmentMode : function() {
        var path = Utils.getProfilePath() +
                'extensions/polymlext@ed.ac.uk';  
        var file = Cc["@mozilla.org/file/local;1"]
                .createInstance(Ci.nsILocalFile);
        file.initWithPath(path);
        return !file.isDirectory();
    },
    
    fileExists : function(filePath) {
        var file = Cc["@mozilla.org/file/local;1"]
            .createInstance(Ci.nsILocalFile);
        file.initWithPath(filePath);
        if (file.exists()) {
            return true;
        }
        return false;
    },
    
    /*
     taken from https://developer.mozilla.org/en/Code_snippets/Tabbed_browse
     r#Reusing_tabs
    */
    openAndReuseOneTabPerURL : function(url) {
        var wm = Cc["@mozilla.org/appshell/window-mediator;1"]
                .getService(Ci.nsIWindowMediator);
        var browserEnumerator = wm.getEnumerator("navigator:browser");
      
        // Check each browser instance for our URL
        var found = false;
        while (!found && browserEnumerator.hasMoreElements()) {
          var browserWin = browserEnumerator.getNext();
          var tabbrowser = browserWin.gBrowser;
      
          // Check each tab of this browser instance
          var numTabs = tabbrowser.browsers.length;
          for (var index = 0; index < numTabs; index++) {
            var currentBrowser = tabbrowser.getBrowserAtIndex(index);
            if (url == currentBrowser.currentURI.spec) {
      
              // The URL is already opened. Select this tab.
              tabbrowser.selectedTab =
                    tabbrowser.tabContainer.childNodes[index];
              tabbrowser.reloadTab(tabbrowser.selectedTab);
      
              // Focus *this* browser-window
              browserWin.focus();
      
              found = true;
              break;
            }
          }
        }
      
        // Our URL isn't open. Open it now.
        if (!found) {
          var recentWindow = wm.getMostRecentWindow("navigator:browser");
          if (recentWindow) {
            // Use an existing browser window
            recentWindow.delayedOpenTab(url, null, null, null, null);
          }
          else {
            // No browser windows are open, so open a new one.
            window.open(url);
          }
        }
    },
      
    createDir : function (dir) {
        var file = Cc["@mozilla.org/file/local;1"]
                .createInstance(Ci.nsILocalFile);
        file.initWithPath(dir);
        if( !file.exists() || !file.isDirectory() ) {
            file.create(Ci.nsIFile.DIRECTORY_TYPE, 0755);
            return true;
        }
        return false;
    },
      
    removeDir : function (dir) {
        var file = Cc["@mozilla.org/file/local;1"]
                .createInstance(Ci.nsILocalFile);
        file.initWithPath(dir);
        if( file.exists() || file.isDirectory() ) {
            file.remove(true);
        }
    },
      
    md5 : function(str) {
        var converter =
            Cc["@mozilla.org/intl/scriptableunicodeconverter"].
            createInstance(Ci.nsIScriptableUnicodeConverter);
        converter.charset = "UTF-8";
        // result is an out parameter,
        // result.value will contain the array length
        var result = {};
        // data is an array of bytes
        var data = converter.convertToByteArray(str, result);
        var ch = Cc["@mozilla.org/security/hash;1"]
                           .createInstance(Ci.nsICryptoHash);
        ch.init(ch.MD5);
        ch.update(data, data.length);
        var hash = ch.finish(false);
        
        // return the two-digit hexadecimal code for a byte
        function toHexString(charCode)
        {
          return ("0" + charCode.toString(16)).slice(-2);
        }
        
        // convert the binary hash data to a hex string.
        var s = [toHexString(hash.charCodeAt(i)) for (i in hash)].join("");
        
        return s;
    },
      
    downloadFile : function(src, base, dest, onComplete) {
        var baseURI = Cc["@mozilla.org/network/io-service;1"]
                .getService(Ci.nsIIOService)
                .newURI(base, null, null);
                
        var srcURI = Cc["@mozilla.org/network/io-service;1"]
                .getService(Ci.nsIIOService)
                .newURI(src, null, baseURI);
        
        var destFile = Cc["@mozilla.org/file/local;1"]
                .createInstance(Ci.nsILocalFile);
        destFile.initWithPath(dest);
        
        // create a persist
        var persist = Cc["@mozilla.org/embedding/browser/nsWebBrowserPersist;1"].
            createInstance(Ci.nsIWebBrowserPersist);
    
        persist.progressListener = {
            onProgressChange: function(aWebProgress, aRequest, aCurSelfProgress, aMaxSelfProgress, aCurTotalProgress, aMaxTotalProgress) {
                var progress = (aCurTotalProgress/aMaxTotalProgress);
                if (progress==1) {
                    onComplete();
                }
            },
            onStateChange : function() {},
            onStatusChange : function() {}
        }
        
        // with persist flags if desired See nsIWebBrowserPersist page for more PERSIST_FLAGS.
        const nsIWBP = Ci.nsIWebBrowserPersist;
        const flags = nsIWBP.PERSIST_FLAGS_REPLACE_EXISTING_FILES;
        persist.persistFlags = flags | nsIWBP.PERSIST_FLAGS_FROM_CACHE;
        
        // download
        try {
            persist.saveURI(srcURI, null, null, null, "", destFile);
        } catch (e) {
            return false;
        }
        return true;
    },
      
    /*
      taken from http://mxr.mozilla.org/mozilla-central/source/toolkit/mozap
      ps/extensions/XPIProvider.jsm#799
    */
    extractZip : function(zipPath, destPath) {
        Components.utils.import("resource://gre/modules/FileUtils.jsm");
        
        var zipFile = Cc["@mozilla.org/file/local;1"]
                .createInstance(Ci.nsILocalFile);
        zipFile.initWithPath(zipPath);
        
        var aDir = Cc["@mozilla.org/file/local;1"]
                .createInstance(Ci.nsILocalFile);
        aDir.initWithPath(destPath);
     
        function getTargetFile(aDir, entry) {
            let target = aDir.clone();
            entry.split("/").forEach(function(aPart) {
                target.append(aPart);
            });
            return target;
        }
       
        let zipReader = Cc["@mozilla.org/libjar/zip-reader;1"].
                         createInstance(Ci.nsIZipReader);
        zipReader.open(zipFile);
       
        try {
            // create directories first
            let entries = zipReader.findEntries("*/");
            while (entries.hasMore()) {
                var entryName = entries.getNext();
                let target = getTargetFile(aDir, entryName);
                if (!target.exists()) {
                    try {
                        target.create(Ci.nsILocalFile.DIRECTORY_TYPE,
                                   FileUtils.PERMS_DIRECTORY);
                    }
                    catch (e) {
                        debug.error("extractFiles: failed to create target directory for " +
                           "extraction file = " + target.path + ", exception = " + e);
                        return false;
                    }
                }
            }
       
            entries = zipReader.findEntries(null);
            while (entries.hasMore()) {
                let entryName = entries.getNext();
                let target = getTargetFile(aDir, entryName);
                //overwrite existing files
                if (target.exists() && target.isDirectory()) {
                    continue;
                }
           
                zipReader.extract(entryName, target);
                target.permissions |= FileUtils.PERMS_FILE;
            }
        }
        finally {
            zipReader.close();
            return true;
        }
    }
}

