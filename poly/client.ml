signature PolyMLext =
sig
  val main: unit -> unit
end;

structure ext: PolyMLext =
struct

    exception Error of string

    val data = "Hello there sailor\n";
    val tempFile = "/var/tmp/polymlext";
    
    fun toFile(text: string) =
        let
            val out = TextIO.openOut tempFile
        in
            TextIO.output(out, text);
            TextIO.closeOut out
        end;
        
    fun eval(code: string) =
        let
        in
            toFile(code);
            PolyML.use tempFile
        end;
    
    fun mkSocks () = let
(*        val server = INetSock.TCP.socket()*)
        val client = INetSock.TCP.socket()
(*        val _ = Socket.bind(server,INetSock.any 11223)*)
(*        val saddr = INetSock.fromAddr(Socket.Ctl.getSockName server)*)
(*        val _ = Socket.listen(server,2)*)
        val SOME me = NetHostDB.getByName "localhost";
        val localhost = NetHostDB.addr me;
        val port = 9998;
        val _ = Socket.connect(client,INetSock.toAddr(localhost, port))
(*        val _ = INetSock.TCP.setNODELAY(server,true)*)
        val _ = INetSock.TCP.setNODELAY(client,true)
    in
        {client=client}
    end
    
    fun send (s,str) =
        let
            val outv = Word8VectorSlice.full
                (Byte.stringToBytes str)
            val bytes_sent = Socket.sendVec(s, outv);
            val _ = PolyML.print ("Sent " ^ (Int.toString bytes_sent) 
                ^ " bytes of " ^ (Int.toString (Word8VectorSlice.length outv)));
        in
(*            Socket.sendVec(out,{buf=Byte.stringToBytes str,i=0,sz=NONE})*)
            PolyML.print ("Sent " ^ (Int.toString bytes_sent) 
                ^ " bytes of " ^ (Int.toString (Word8VectorSlice.length outv)))
        end
   
    fun readString (s,n) =
        let
            fun loop(0) = []
              | loop(n) =
                let
                    val data = Byte.bytesToString(Socket.recvVec(s,n))
                    val len = String.size data
                in
                    if len = 0 then []
                    else (data::(loop(n - len)))
                end
        in
            String.concat (loop n)
        end
    
(*    fun writeString (out,str) = *)
(*        Socket.sendVec(out,{buf=Byte.stringToBytes str,i=0,sz=NONE})*)
    
    fun closeSock s =
        (Socket.shutdown(s,Socket.NO_RECVS_OR_SENDS);
         Socket.close s)

    fun main() = 
        let
            val {client=client_sock} = mkSocks()
            fun client () =
                let
                    fun c 0 = closeSock(client_sock)
                      | c n =
                        let
                            (*val _ = writeString(client_sock,data);*)
                            (*val reply = readString(client_sock,19);*)
                            val reply = Byte.bytesToString(Socket.recvVec(client_sock,1024));
                            val _ = send(client_sock, "getElementByID(\"foo\")")
                        in
                            print "received: ";
                            print reply;
                            print "\nExecuting the code...\n";
                            eval(reply)
(*                            if reply = data then c(n - 1)*)
(*                            else raise Error "Didn't receive the same data"*)
                        end
                in
                    c 1
                end
        in
            client()
        end;
        
end;
