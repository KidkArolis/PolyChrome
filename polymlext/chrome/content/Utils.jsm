var EXPORTED_SYMBOLS = ["Utils"];

var Utils = {
    getProfilePath : function() {
        var fileLocator = Components
                .classes["@mozilla.org/file/directory_service;1"]
                .getService(Components.interfaces.nsIProperties);
        var path = fileLocator
                .get("ProfD",Components.interfaces.nsIFile).path;
        path = escape(path.replace(/\\/g, "/")) + "/";
        if (path.indexOf("/") != 0) {
            path = '/' + path;
        }
        return path;
    },

    readFile : function(filename) {
        var file = Components.classes["@mozilla.org/file/local;1"]
            .createInstance(Components.interfaces.nsILocalFile);
        file.initWithPath(filename);
        if (file.exists() == false || file.isDirectory()) {
            return null;
        }
        var is = Components
                .classes["@mozilla.org/network/file-input-stream;1"]
                .createInstance(Components.interfaces.nsIFileInputStream);
        is.init( file,0x01, 00004, null);
        var sis = Components.classes["@mozilla.org/scriptableinputstream;1"]
                .createInstance(Components.interfaces.
                                nsIScriptableInputStream);
        sis.init(is);
        var output = sis.read(sis.available());
        return output;
    },

    startProcess : function(binpath, args, blocking) {
        var file = Components.classes["@mozilla.org/file/local;1"]
                .createInstance(Components.interfaces.nsILocalFile);
        file.initWithPath(binpath);
        var process = Components.classes["@mozilla.org/process/util;1"]
                .createInstance(Components.interfaces.nsIProcess);
        process.init(file);
        process.run(blocking, args, args.length);
        return process;
    },
    
    findPoly : function() {
        var debug = Components.classes["@ed.ac.uk/poly/debug-console;1"]
                .getService().wrappedJSObject;
        
        //if the user has manually given the path return true
        var prefService = Components
                .classes["@mozilla.org/preferences-service;1"]
                .getService(Components.interfaces.nsIPrefBranch)
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
        var file = Components.classes["@mozilla.org/file/local;1"]
                .createInstance(Components.interfaces.nsILocalFile);
        file.initWithPath(path);
        return !file.isDirectory();
    },
    
    /*
     taken from https://developer.mozilla.org/en/Code_snippets/Tabbed_browse
     r#Reusing_tabs
    */
    openAndReuseOneTabPerURL : function(url) {
        var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
                .getService(Components.interfaces.nsIWindowMediator);
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
      }
}

