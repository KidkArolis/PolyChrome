const Cc = Components.classes;
const Ci = Components.interfaces;
const Cr = Components.results;

//use only for debugging
var consoleService = Cc["@mozilla.org/consoleservice;1"]
            .getService(Components.interfaces.nsIConsoleService);
var log = function(m) {
    this.consoleService.logStringMessage("Utils: " + m + "\n");
}

var EXPORTED_SYMBOLS = ["Utils"];

var Utils = {
    
    getExtensionPath : function() {
        var fileLocator = Components
                .classes["@mozilla.org/file/directory_service;1"]
                .getService(Ci.nsIProperties);
        var extPath = fileLocator.get("ProfD", Ci.nsILocalFile);
        extPath.append("extensions");
        extPath.append("polymlext@ed.ac.uk");
        //polymlext@ed.ac.uk is a file when developing and a directory
        //when installed as an xpi extension
        if (!extPath.isDirectory()) {
            var path = Utils.readFile(extPath);
            //remove the newline
            path = path.replace(/\n/g, "");
            extPath.initWithPath(path);
        }
        return extPath;
    },
    
    isDevelopmentMode : function() {
        var fileLocator = Components
                .classes["@mozilla.org/file/directory_service;1"]
                .getService(Ci.nsIProperties);
        var extPath = fileLocator.get("ProfD", Ci.nsILocalFile);
        extPath.append("extensions");
        extPath.append("polymlext@ed.ac.uk");
        //polymlext@ed.ac.uk is a file when developing and a directory
        //when installed as an xpi extension
        return !extPath.isDirectory();
    },

    readFile : function(file) {
        if (file.exists() == false || file.isDirectory()) {
            return null;
        }
        var is = Components
                .classes["@mozilla.org/network/file-input-stream;1"]
                .createInstance(Ci.nsIFileInputStream);
        is.init(file, 0x01, 00004, null);
        var sis = Cc["@mozilla.org/scriptableinputstream;1"]
                .createInstance(Ci.nsIScriptableInputStream);
        sis.init(is);
        var output = sis.read(sis.available());
        return output;
    },

    startProcess : function(binfile, args, blocking) {
        var process = Cc["@mozilla.org/process/util;1"]
                .createInstance(Ci.nsIProcess);
        process.init(binfile);
        process.run(blocking, args, args.length);
        return process;
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
    
    getTabForDocument : function(doc) {
        var wm = Cc["@mozilla.org/appshell/window-mediator;1"]
                .getService(Ci.nsIWindowMediator);
        var browserEnumerator = wm.getEnumerator("navigator:browser");
        while (browserEnumerator.hasMoreElements()) {
            var browserWin = browserEnumerator.getNext();
            var tabbrowser = browserWin.gBrowser;
      
            // Check each tab of this browser instance
            var numTabs = tabbrowser.browsers.length;
            for (var index = 0; index < numTabs; index++) {
                var currentTab = tabbrowser.tabContainer.childNodes[index];
                var currentBrowser = tabbrowser.getBrowserAtIndex(index);
                if (doc == currentBrowser.contentDocument) {
                    return currentTab;
                }
            }
        }
        return false;
    },
    
    createDir : function (dir) {
        if(!dir.exists()) {
            dir.create(Ci.nsIFile.DIRECTORY_TYPE, 0755);
            return true;
        }
        return false;
    },
    
    removeDir : function (dir) {
        if(dir.exists() && dir.isDirectory()) {
            dir.remove(true);
            return true;
        }
        return false;
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
    
    downloadFile : function(src, base, targetFile, progressListener) {
        var ios = Cc["@mozilla.org/network/io-service;1"]
                .getService(Ci.nsIIOService);
                
        var baseURI = ios.newURI(base, null, null);
        var srcURI = ios.newURI(src, null, baseURI);
        
        var listener = {
            onStateChange: function(aWebProgress, aRequest, aFlag, aStatus) {
                if (aFlag & Ci.nsIWebProgressListener.STATE_STOP) {
                    progressListener.onComplete();
                }
            },
            onStatusChange : function(aWebProgress, aRequest, aStatus, aMessage) {
                //I assume this is called when the download failed
                progressListener.onError();
            },
            onProgressChange : function(aWebProgress, aRequest,
                                        aCurSelfProgress, aMaxSelfProgress,
                                        aCurTotalProgress, aMaxTotalProgres) {
                var percentComplete = Math.ceil((aCurSelfProgress/aMaxSelfProgress)*100);
                progressListener.onProgressChange(percentComplete);
            },
            onLocationChange : function(a, b, c) {},
            onSecurityChange : function(a, b, c) {}
        }
        
        var persist = Cc["@mozilla.org/embedding/browser/nsWebBrowserPersist;1"]
                .createInstance(Ci.nsIWebBrowserPersist);
        persist.persistFlags =
                Ci.nsIWebBrowserPersist.PERSIST_FLAGS_REPLACE_EXISTING_FILES
              | Ci.nsIWebBrowserPersist.PERSIST_FLAGS_FROM_CACHE;
        
        persist.progressListener = listener;
        
        // download
        try {
            persist.saveURI(srcURI, null, null, null, "", targetFile);
        } catch (e) {
            //we're already reporting the error in the onStatusChange function
            //above
        }
    },
    
    /*
      taken from http://mxr.mozilla.org/mozilla-central/source/toolkit/mozap
      ps/extensions/XPIProvider.jsm#799
    */
    extractZip : function(zipFile, aDir) {
        Components.utils.import("resource://gre/modules/FileUtils.jsm");
     
        function getTargetFile(aDir, entry) {
            let target = aDir.clone();
            entry.split("/").forEach(function(aPart) {
                target.append(aPart);
            });
            return target;
        }       
       
        let zipReader = Cc["@mozilla.org/libjar/zip-reader;1"].
                         createInstance(Ci.nsIZipReader);
        try {
            zipReader.open(zipFile);
        } catch (e) {
            throw("failed to open the zip file: " + e);
        }
           
        /*
        if (!zipReader.test(null)) {
            return false;
        }
        */
       
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
                        throw("failed to create target directory: " + e);
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
        catch (e) {
            throw("failed to unzip: " + e)
        }
        finally {
            zipReader.close();
        }
    },
    
    fileExists : function(path) {
        try {
            var file = Cc["@mozilla.org/file/local;1"].
                    createInstance(Ci.nsILocalFile);
            file.initWithPath(path);
            return file.exists();
        } catch (e) {
            return false;
        }
    },
    
    randomString : function() {
        return this.md5(Math.random().toString()).substring(0,8);
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
        if (obj!=null && obj.hasOwnProperty && obj.hasOwnProperty("toString")) {
            objstr += "} = "+ obj.toString();
        } else {
            objstr += "} = "+ obj;
        }
        
        return objstr;
    }
}

