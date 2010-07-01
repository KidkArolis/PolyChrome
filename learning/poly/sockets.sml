structure Test : sig
 val main : (string * string list) -> OS.Process.status
end =     
 struct        
   exception Error of string
    
   val data = "Hello there sailor\n"

   fun mkSocks () = let
     val server = INetSock.TCP.socket()
     val client = INetSock.TCP.socket()
     val _ = Socket.bind(server,INetSock.any 0)
     val saddr = INetSock.fromAddr(Socket.Ctl.getSockName server)
     val _ = Socket.listen(server,2)
     val _ = Socket.connect(client,INetSock.toAddr saddr)
     val _ = INetSock.TCP.setNODELAY(server,true)
     val _ = INetSock.TCP.setNODELAY(client,true)
   in {client=client,server=server}
   end

   fun readString (s,n) = let
     fun loop(0) = []
       | loop(n) = let
       val data = Byte.bytesToString(Socket.recvVec(s,n))
       val len = String.size data
     in if len = 0 then []
        else (data::(loop(n - len)))
     end
   in String.concat (loop n)
   end
 
   fun writeString (out,str) = 
     Socket.sendVec(out,{buf=Byte.stringToBytes str,i=0,sz=NONE})

   fun closeSock s =
     (Socket.shutdown(s,Socket.NO_RECVS_OR_SENDS);
      Socket.close s)

  fun main (_,args) = let
    val num =
      case args of
    nil => 1
      | n::_ => valOf (Int.fromString n)
    val {client=client_sock,server=server_sock} = mkSocks()
    fun server () = let
      val (sock,_) = Socket.accept(server_sock)
      fun s b = 
    case readString(sock,19) of
       "" => (Posix.Process.wait ();
          TextIO.output(TextIO.stdOut,
                concat ["server processed ",
                    Int.toString b,
                    " bytes\n"]);
          TextIO.flushOut(TextIO.stdOut))
     | i =>(writeString(sock,i);
        s (b + 19))
    in s 0
    end
    fun client () = let
      fun c 0 = closeSock(client_sock)
    | c n = let
        val _ = writeString(client_sock,data);
        val reply = readString(client_sock,19)
      in if reply = data then c(n - 1)
         else raise Error "Didn't receive the same data"
      end
    in c num
    end
  in
    case Posix.Process.fork () of
      SOME pid => server ()
    | NONE => client ();
     OS.Process.success
  end 
end

val _ = PolyML.export("test",Test.main);
