var PolyMLext = (function ()
{
    var console;
    
    var polyPages = [];
    
    var lookForPolyML = function(document) {
        //currently we're not looking for <script type="application/x-polyml">
        //but for an element with id "code"
        var code = document.getElementById('code');
        if (code!=null) {
            console.log("Found PolyML code on page: " + document.location.href);
            var poly = createPolyInstance(document, code.innerHTML);
            polyPages.push({"document": document});
            polyPages[polyPages.length-1].poly = poly;
            poly = null;
            //add event listener for page unload   
            document.defaultView.addEventListener("unload", 
                onPageUnload, true);
        }
        
        //solving the bug..
        if (polyPages.length > 1) {
            for (var i=0, len=polyPages.length; i<len; ++i) {
                console.log("the following ports should be different:");
                console.log(polyPages[i].poly.Server.port());
            }
        }
    }
    
    var createPolyInstance = function(documnent, code) {
        var poly = Cc["@ed.ac.uk/poly;1"].createInstance().wrappedJSObject;
        poly.processCode(document, code);
        return poly;
    }

    var onPageLoad = function(aEvent) {
        if (!aEvent) { return; }
        if (aEvent.originalTarget.nodeName != "#document") {return;}
        if (aEvent.originalTarget instanceof HTMLDocument) {
            var doc = aEvent.originalTarget;
            lookForPolyML(doc);
        }
    }
    
    var onPageUnload = function(aEvent) {
        var doc = aEvent.originalTarget;
        console.log("Page unloaded:" + doc.location.href);
        for (var i=0, len=polyPages.length; i<len; ++i){
            if (polyPages[i].document == doc) {
                polyPages[i].poly.destroy();
                polyPages.splice(i, 1);
                break;
            }
        }
    }
    
    var bindLoadUnload = function() {
        var appcontent = document.getElementById("appcontent");   // browser  
        if(appcontent) {
            appcontent.addEventListener("load", onPageLoad, true);
        }
    }
    
    var init = function () {
        console = Cc["@ed.ac.uk/poly/console;1"].getService().wrappedJSObject;
        bindLoadUnload();
        var reader = {
            onInputStreamReady : function(input) {
                var sin = Cc["@mozilla.org/scriptableinputstream;1"]
                            .createInstance(Ci.nsIScriptableInputStream);
                sin.init(input);
                sin.available();
                var request = '';
                while (sin.available()) {
                  request = request + sin.read(512);
                }
                console.log('Received: ' + request);
                input.asyncWait(reader,0,0,null);
            } 
        }        
        var listener = {
            onSocketAccepted: function(serverSocket, clientSocket) {
                console.log("Accepted connection on "+clientSocket.host+":"+clientSocket.port);
                input = clientSocket.openInputStream(0, 0, 0).QueryInterface(Ci.nsIAsyncInputStream);
                output = clientSocket.openOutputStream(Ci.nsITransport.OPEN_BLOCKING, 0, 0);
                input.asyncWait(reader,0,0,null);
            }
        }
        var serverSocket = Cc["@mozilla.org/network/server-socket;1"].
                            createInstance(Ci.nsIServerSocket);
        serverSocket.init(-1, true, 5);
        console.log("Opened socket on " + serverSocket.port);
        serverSocket.asyncListen(listener);
    }
    
    return {
        init: init
    }
    
}());

//window.onclose = PolyMLext.cleanUp;

PolyMLext.init();
