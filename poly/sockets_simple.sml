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
   
fun closeSock s =
    (Socket.shutdown(s,Socket.NO_RECVS_OR_SENDS);
     Socket.close s)

fun main() =
    let val s = INetSock.TCP.socket()
    in
        Socket.bind(s, INetSock.any 9997);
        Socket.listen(s, 5);
        print "Listening\n";
        let
            val (sock,_) = Socket.accept(s)
            fun s b = 
            case readString(sock,19) of
               "" => (TextIO.output(TextIO.stdOut,
                        concat ["server processed ",
                            Int.toString b,
                            " bytes\n"]);
                  TextIO.flushOut(TextIO.stdOut))
             | i =>(s (b + 19))
            in s 0
            end   
    end
