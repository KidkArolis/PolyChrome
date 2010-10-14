(* 

    HOW TO USE: 

In one terminal, type: 

  poly
  use "echo_socket_server.sml";
  main();

In another terminal, use the command: 

  telnet localhost 8080

to connect to the server we have established. 

*)

(* create a socket listening to port 8080, with a 128 byte buffer *)
fun mkServerSocket () = 
    let
      val server = INetSock.TCP.socket();
      val _ = Socket.bind(server, INetSock.any 8080);
      val _ = Socket.Ctl.setREUSEADDR(server,true);
      val saddr = INetSock.fromAddr(Socket.Ctl.getSockName server);
      val _ = Socket.listen(server,128);
    in (saddr,server) end;

(* given an active socket, read the next bytes (upto 80 of them), print the
   bytes out as string. If the string was empty (connection closed by client),
   was control-D, or the string "exit\r\n", then stop reading input. *)
fun readLoop active_socket = 
    let 
      val s = Byte.bytesToString(Socket.recvVec(active_socket,80));
      val _ = PolyML.print s; (* print to output *)
      val outv = Word8VectorSlice.full 
                   (Byte.stringToBytes s)
      val bytes_sent = Socket.sendVec(active_socket,outv);
      val _ = PolyML.print ("Sent " ^ (Int.toString bytes_sent) 
                ^ " bytes of " ^ (Int.toString (Word8VectorSlice.length outv)));
    in   
       if String.size s = 0 orelse s = "\^D" orelse s = "exit\r\n" then () 
       else readLoop active_socket
    end;

(* Given an active socket and address, print out that we've established a 
   connection and then enter the read loop. *)
fun handleConnection active_socket active_socket_addr = 
    let 
      val (net_addr,port) = INetSock.fromAddr active_socket_addr
      val _ = PolyML.print 
              ("Connected to: " ^ (NetHostDB.toString net_addr) 
               ^ " : " ^ (Int.toString port));
      val _ = readLoop active_socket
    in () end;

(* given a listening socket, get the next active connection, 
   handle the connection, then close the active socket. *)
fun getAndHandleConnection server_socket = 
    let
      val (active_socket,active_socket_addr) = Socket.accept(server_socket)
    in 
      handleConnection active_socket active_socket_addr;
      Socket.close active_socket
    end;

(* create a server socket, get and handle a connection, then exit ML. *)
fun main() = 
    let
      val (saddr,server_socket) = mkServerSocket();
      val _ = getAndHandleConnection server_socket;
    in OS.Process.exit OS.Process.success end;


