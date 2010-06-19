signature PolyMLext =
sig
  val main: unit -> unit
end;

structure ext: PolyMLext =
struct

    val data = "Hello there sailor\n";
    
    fun mkSocks () = let
        val server = INetSock.TCP.socket()
        val client = INetSock.TCP.socket()
        val _ = Socket.bind(server,INetSock.any 11223)
        val saddr = INetSock.fromAddr(Socket.Ctl.getSockName server)
        val _ = Socket.listen(server,2)
        val _ = Socket.connect(client,INetSock.toAddr saddr)
        val _ = INetSock.TCP.setNODELAY(server,true)
        val _ = INetSock.TCP.setNODELAY(client,true)
    in
        {client=client,server=server}
    end
   
    fun readString (s,n) =
        let
            fun loop(0) = []
              | loop(n) =
                let
                    val data = Byte.bytesToString(Socket.recvVec(s,n))
                    val len = String.size data
                in
                    print "receiving\n";
                    if len = 0 then []
                    else (data::(loop(n - len)))
                end
        in
            String.concat (loop n)
        end
    
    fun writeString (out,str) = 
        Socket.sendVec(out,str)
    
    fun closeSock s =
        (Socket.shutdown(s,Socket.NO_RECVS_OR_SENDS);
         Socket.close s)


    fun main() = 
        let
            val {client=client_sock,server=server_sock} = mkSocks()
            fun server () =
                let
                    val (sock,_) = Socket.accept(server_sock)
                    fun s b = 
                        case readString(sock,19) of
                        "" => (TextIO.output(TextIO.stdOut,
                                concat ["server processed ",
                                Int.toString b,
                                " bytes\n"]);
                                TextIO.flushOut(TextIO.stdOut))
                        (*)| i =>(writeString(sock,i);
                            s (b + 19))*)
                in
                    print "listening...\n";
                    s 0
                end
            fun client () =
                let
                    fun c 0 = closeSock(client_sock)
                      | c n =
                        let
                            val _ = writeString(client_sock,data);
                            val reply = readString(client_sock,19)
                        in
                            if reply = data then c(n - 1)
                            else raise Error "Didn't receive the same data"
                        end
                in
                    c num
                end
        in
        (*
            case Posix.Process.fork () of
                SOME pid => server ()
              | NONE => server ();
            OS.Process.success
        *)
            client()
        end;
        
end;
