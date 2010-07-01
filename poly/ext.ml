use "js.ml";

signature PolyMLext =
sig
  val main: unit -> unit
end;

structure ext
(* : PolyMLext *) 
= struct

    val gsock = ref (NONE : Socket.active INetSock.stream_sock option)

    exception Error of string

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
            val _ = toFile(code);
        in
            PolyML.use tempFile
        end;
    
    fun mkSock () = let
        val client = INetSock.TCP.socket()
        val me = case NetHostDB.getByName "localhost" of
	                NONE => raise Error ""
	              | SOME en => en;
        val localhost = NetHostDB.addr me;
        val port = 9998;
        val _ = Socket.connect(client,INetSock.toAddr(localhost, port))
        val _ = INetSock.TCP.setNODELAY(client,true)
    in
        client
    end
    
    
    
    fun send (str) =
        let
            val outv = Word8VectorSlice.full
                (Byte.stringToBytes str)
            val bytes_sent = Socket.sendVec(Option.valOf (!gsock), outv);
        in
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
    
    fun closeSock s =
        (Socket.shutdown(s,Socket.NO_RECVS_OR_SENDS);
         Socket.close s)

    fun main() = 
        let
            val client_sock = mkSock();
            val _ = (gsock := SOME client_sock);
            
            val code = Byte.bytesToString(Socket.recvVec(client_sock,1000));
        in
            (*send("teeeeest");*)
            eval(code);
            closeSock(client_sock);
            OS.Process.exit OS.Process.success
        end;
        
end;
