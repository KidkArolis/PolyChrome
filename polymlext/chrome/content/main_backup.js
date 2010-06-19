     var serverSocket;
        var currentThread = Cc["@mozilla.org/thread-manager;1"]
                                .getService()
                                .currentThread;
        //create a socket and start listening
        var listener = {
            onSocketAccepted: function (serverSocket, clientSocket) {
                dump(">>> accepted connection on "+clientSocket.host+":"+clientSocket.port+"\n");
                var input = clientSocket.openInputStream(nsITransport.OPEN_BLOCKING, 0, 0);
                var output = clientSocket.openOutputStream(nsITransport.OPEN_BLOCKING, 0, 0);

                //read the input
                
                
                //send the output
                //var response = "WOVAVYVA";
                //output.write(response, response.length);
                
//                try {
//                    /*
//					var outputString = "HTTP/1.1 200 OK\n" +
//					"Content-type: text/plain\n\n" +
//					"Hello there " + transport.host + "\n";
//					var stream = transport.openOutputStream(0,0,0);
//					stream.write(outputString,outputString.length);
//					stream.close();
//					*/
//                    var inStream = transport.openInputStream(0, 0, 0);
//                    waitForMoreInput(inStream);
//                    
//                    //stream.close();
//                    //log("Msg received: " + input);
//                }
//                catch (e) {
//                    log(e);
//                }
                
                input.close();
                output.close();
            }, onStopListening: function (socket, status) {
                log('Stopped listening.');
            }
        }
        var waitForMoreInput = function (stream) {
            stream = stream.QueryInterface(Ci.nsIAsyncInputStream);
            stream.asyncWait(reader, 0, 0, currentThread);
        }
   		var reader = {
            onInputStreamReady: function (stream) {
                //var bis = new BinaryInputStream(stream);
                var av = 0;
                try {
                    av = stream.available();
                }
                catch (e) { /* default to 0 */
                    log(e);
                }
                if (av > 0) {
                    received += String.fromCharCode.apply(null, bis.readByteArray(av));
                    waitForMoreInput(stream);
                    return;
                }
                //log("Msg received: " + received);
                log('closing the stream...');
                stream.close();
            }
        }
        
        try {
            serverSocket = Components.classes["@mozilla.org/network/server-socket;1"].
                createInstance(Components.interfaces.nsIServerSocket);
            serverSocket.bind(9998, true, 5);
            serverSocket.asyncListen(listener);
            log("Listening...");
        }
        catch (e) {
            log(e);
        }
        
        var closeSocket = function() {
            serverSocket.close();
            log("Stopped listening...");
        }
        //window.addEventListener("unload", closeSocket, false);
