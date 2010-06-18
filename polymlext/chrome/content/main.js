var BinaryInputStream = Components.Constructor("@mozilla.org/binaryinputstream;1",
                            "nsIBinaryInputStream",
                            "setInputStream");

var PolyMLext = (function ()
{
    var log = dump = function (aMessage) {
        var consoleService = Components.classes["@mozilla.org/consoleservice;1"].getService(Components.interfaces.nsIConsoleService);
        consoleService.logStringMessage("PolyMLext: " + aMessage);
    }
    
    var runCppXPCOM = function () {
        try {
            // normally Firefox extensions implicitly have XPCOM privileges, but since this is a file we have to request it.
            // netscape.security.PrivilegeManager.enablePrivilege("UniversalXPConnect");
            const cid = "@mozilla.org/polymlext/polymldom;1";
            obj = Components.classes[cid].createInstance();
            // bind the instance we just created to our interface
            obj = obj.QueryInterface(Components.interfaces.IPolyMLDOM);
        }
        catch (err) {
            alert(err);
            return;
        }
        log("test2");
        var res = obj.Add(3, 4);
        log("3+4=" + res);
    }
    
    var runJsXPCOM = function () {
        try {
            //Components.classes['@ed.ac.uk/polymlext;1'].getService()
            //netscape.security.PrivilegeManager.enablePrivilege("UniversalXPConnect");  
            var myComponent = Components.classes['@ed.ac.uk/polymlext;1']
            //.getService().wrappedJSObject;
                .createInstance(Components.interfaces.nsIHelloWorld);
            log(myComponent.hello());
        }
        catch (anError) {
            log("ERROR: " + anError);
        }
    }
    
    var startPoly = function () {
        // create an nsILocalFile for the executable
        var file = Cc["@mozilla.org/file/local;1"]
                             .createInstance(Components.interfaces.nsILocalFile);
        file.initWithPath("/home/karolis/Dropbox/msc/extension/poly/polymlext");
        // create an nsIProcess
        var process = Cc["@mozilla.org/process/util;1"]
                                .createInstance(Ci.nsIProcess);
        process.init(file);

        // Run the process.
        // If first param is true, calling thread will be blocked until
        // called process terminates.
        // Second and third params are used to pass command-line arguments
        // to the process.
        var args = [];
        process.run(false, args, args.length);
    }
    
    var startSocket = function () {
        serverSocket = Cc["@mozilla.org/network/server-socket;1"].
                createInstance(Ci.nsIServerSocket);
        
        listener = {
            onSocketAccepted: function(serverSocket, clientSocket) {
                log("accepted connection on "+clientSocket.host+":"+clientSocket.port+"\n");

                var input = clientSocket.openInputStream(0, 0, 0).QueryInterface(Ci.nsIAsyncInputStream);
                var output = clientSocket.openOutputStream(Ci.nsITransport.OPEN_BLOCKING, 0, 0);
                
//                while(true) {
//                    var response = this.consumeInput(input);
//                    var n = output.write(response, response.length);
//                    log(">>> wrote "+n+" bytes\n");
//                    break;
//                }

                var reader = {
                    onInputStreamReady : function(input) {
//                        var data = new LineData();
//                        data.appendBytes(readBytes(input, input.available()));
//                        var received = {value:''};
//                        log("full line? " + data.readLine(received));
//                        log('Received: '+received.value);

                        var sin = Cc["@mozilla.org/scriptableinputstream;1"]
                                    .createInstance(Ci.nsIScriptableInputStream);
                        sin.init(input);
                        sin.available();
                        var data = '';
                        while (sin.available()) {
                          data = data + sin.read(512);
                        }
                        log('received: '+data);
                        
                        var n = output.write(data, data.length);
                        log(">>> wrote "+n+" bytes\n");
                        
                        input.asyncWait(reader,0,0,null);
                    } 
                }

                input.asyncWait(reader,0,0,null);
                
//                var waitForMoreInput = function (stream) {
//                    stream = stream.QueryInterface(Ci.nsIAsyncInputStream);
//                    stream.asyncWait(reader, 0, 0, null);
//                }
//                var received = ''
//           		var reader = {
//                    onInputStreamReady: function (stream) {
//                        log("oh yeah1");
//                        var bis = new BinaryInputStream(stream);
//                        var av = 0;
//                        try {
//                            av = stream.available();
//                        }
//                        catch (e) { /* default to 0 */
//                            log(e);
//                        }
//                        if (av > 0) {
//                            received += String.fromCharCode.apply(null, bis.readByteArray(av));
//                            waitForMoreInput(stream);
//                            return;
//                        }
//                        //log("Msg received: " + received);
//                        log('closing the input stream...');
//                        stream.close();
//                        
//                        var response = "Foooyaaa!!";
//                        var n = output.write(response, response.length);
//                        log(">>> wrote "+n+" bytes\n");
//                        output.close();
//                    }
//                }

//                waitForMoreInput(input);

                //input.close();
                //output.close();
//                closeSocket();
            },
            onStopListening: function(serverSocket, status) {
                log("shutting down server socket\n");
            },
            consumeInput: function(input) {
                /* use nsIScriptableInputStream to consume all of the data on the stream */
                var sin = Cc["@mozilla.org/scriptableinputstream;1"]
                                    .createInstance(Ci.nsIScriptableInputStream);
                sin.init(input);
                
                sin.available();
                while (!sin.available()) {}//spin
                var data = '';
                while (sin.available()) {
                  data = data + sin.read(512);
                }
                log('received: '+data);
                return data;
            }
        }
        try {
            serverSocket.init(9998, true, 5);
            serverSocket.asyncListen(listener);
            log("listening on port 9998...");
        }
        catch (e) {
            //log(e);
            log("The port is already in use.")
        }
        
        var closeSocket = function() {
            serverSocket.close();
            log("Stopped listening...");
        }
        window.addEventListener("unload", closeSocket, false);
    }
    
    var init = function () {
        //runCppXPCOM();
        //runJsXPCOM();
        //startPoly();
        startSocket();
    }
    
    return {
        init: init
    }
    
}());

/**
 * A container which provides line-by-line access to the arrays of bytes with
 * which it is seeded.
 */
function LineData()
{
  /** An array of queued bytes from which to get line-based characters. */
  this._data = [];
}
LineData.prototype =
{
  /**
   * Appends the bytes in the given array to the internal data cache maintained
   * by this.
   */
  appendBytes: function(bytes)
  {
    Array.prototype.push.apply(this._data, bytes);
  },

  /**
   * Removes and returns a line of data, delimited by CRLF, from this.
   *
   * @param out
   *   an object whose "value" property will be set to the first line of text
   *   present in this, sans CRLF, if this contains a full CRLF-delimited line
   *   of text; if this doesn't contain enough data, the value of the property
   *   is undefined
   * @returns boolean
   *   true if a full line of data could be read from the data in this, false
   *   otherwise
   */
  readLine: function(out)
  {
    var data = this._data;
    var line = String.fromCharCode.apply(null, data.splice(0, data.length + 2));
    out.value = line.substring(0, data.length);
    return true;
  
    var data = this._data;
    var length = findCRLF(data);
    if (length < 0)
      return false;

    //
    // We have the index of the CR, so remove all the characters, including
    // CRLF, from the array with splice, and convert the removed array into the
    // corresponding string, from which we then strip the trailing CRLF.
    //
    // Getting the line in this matter acknowledges that substring is an O(1)
    // operation in SpiderMonkey because strings are immutable, whereas two
    // splices, both from the beginning of the data, are less likely to be as
    // cheap as a single splice plus two extra character conversions.
    //
    var line = String.fromCharCode.apply(null, data.splice(0, length + 2));
    out.value = line.substring(0, length);

    return true;
  },

  /**
   * Removes the bytes currently within this and returns them in an array.
   *
   * @returns Array
   *   the bytes within this when this method is called
   */
  purge: function()
  {
    var data = this._data;
    this._data = [];
    return data;
  }
};

function readBytes(inputStream, count)
{
   return new BinaryInputStream(inputStream).readByteArray(count);
}

/** The character codes for CR and LF. */
const CR = 0x0D, LF = 0x0A;

/**
 * Calculates the number of characters before the first CRLF pair in array, or
 * -1 if the array contains no CRLF pair.
 *
 * @param array : Array
 *   an array of numbers in the range [0, 256), each representing a single
 *   character; the first CRLF is the lowest index i where
 *   |array[i] == "\r".charCodeAt(0)| and |array[i+1] == "\n".charCodeAt(0)|,
 *   if such an |i| exists, and -1 otherwise
 * @returns int
 *   the index of the first CRLF if any were present, -1 otherwise
 */
function findCRLF(array)
{
  for (var i = array.indexOf(CR); i >= 0; i = array.indexOf(CR, i + 1))
  {
    if (array[i + 1] == LF)
      return i;
  }
  return -1;
}

PolyMLext.init();
