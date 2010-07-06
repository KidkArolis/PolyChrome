(*signature POLYMLEXT =*)
(*sig*)
(*  val main: 'a * string list -> 'b*)
(*  val send: string -> string*)
(*  val recv: unit -> string*)
(*  val test: unit -> unit*)
(*end;*)

structure PolyMLext (*: POLYMLEXT*)
= struct

    val gsock = ref (NONE : Socket.active INetSock.stream_sock option)

    exception Error of string
   
    fun the (reference) = Option.valOf (!reference)

    fun escape_quotes s = implode (foldr op@ [] (map (fn #"\"" => [#"\\", #"\""] | x => [x]) (explode s)));
    
    fun mkSock (port) =
        let
            val client = INetSock.TCP.socket()
            val me = case NetHostDB.getByName "localhost" of
	                    NONE => raise Error ""
	                  | SOME en => en;
            val localhost = NetHostDB.addr me;
(*            val port = 9998;*)
            val _ = Socket.connect(client,INetSock.toAddr(localhost, port))
            val _ = INetSock.TCP.setNODELAY(client,true)
        in
            client
        end
    
    fun send (str) =
        let
            val outv = Word8VectorSlice.full
                (Byte.stringToBytes str)
(*            val bytes_sent = Socket.sendVec(the gsock, outv);*)
        in
(*            PolyML.print ("Sent " ^ (Int.toString bytes_sent) *)
(*                ^ " bytes of " ^ (Int.toString (Word8VectorSlice.length outv)))*)
            Socket.sendVec(the gsock, outv)
        end
        
    fun recv () =
        Byte.bytesToString(Socket.recvVec(the gsock, 1000))
   
    fun recv2 (s,n) =
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
         Socket.close s);
         
    fun evaluate location_url txt =
        let
            (* uses input and output buffers for compilation and output message *)
            val in_buffer = ref (String.explode txt);
            val out_buffer = ref ([]: string list);
            val current_line = ref 1;

            (* helper function *)
            fun drop_newline s =
            if String.isSuffix "\n" s then String.substring (s, 0, size s - 1)
            else s;

            fun output () = (String.concat (rev (! out_buffer)));

            (* take a charcter out of the input txt string *)
            fun get () =
              (case ! in_buffer of
                [] => NONE
              | c :: cs =>
                  (in_buffer := cs; if c = #"\n" then current_line := ! current_line + 1 else (); SOME c));

            (* add to putput buffer *)
            fun put s = (out_buffer := s :: ! out_buffer);
            
            (* handling error messages *)
            fun put_message { message = msg1, hard, location : PolyML.location, 
                              context } =
                let val line_width = 76; in
                   (put (if hard then "Error: " else "Warning: ");
                    PolyML.prettyPrint (put, line_width) msg1;
                    (case context of NONE => () 
                     | SOME msg2 => PolyML.prettyPrint (put, line_width) msg2);
                     put ("At line " ^ (Int.toString (#startLine location)) ^ "; in url: " 
                          ^ location_url ^ "\n"))
                end;

            val compile_params = 
              [(* keep track of line numbers *)
               PolyML.Compiler.CPLineNo (fn () => ! current_line),

               (* the following catches any output during 
                  compilation/evaluation and store it in the put stream. *)
               PolyML.Compiler.CPOutStream put,
                      (* the following handles error messages specially 
                  to say where they come from in the error message into 
                  the put stream. *)
               PolyML.Compiler.CPErrorMessageProc put_message
              ]

            val (worked,_) = 
              (true, while not (List.null (! in_buffer)) do 
                     PolyML.compiler (get, compile_params) ())
              handle exn => (* something went wrong... *)
               (false, (put ("Exception- " ^ General.exnMessage exn ^ " raised"); ()
                (* Can do other stuff here: e.g. raise exn *) ));

              (* finally, print out any messages in the output buffer *)
            val output_string = output();
        in
(*            if worked then TextIO.print (output())*)
(*            else TextIO.print (output())*)
            send("{\"type\":1, \"output\":\""^(escape_quotes output_string)^"\"}")
        end;
    
    fun test() = print "not good\n";
         
    fun loop () =
        let
            val code = recv();
        in
            evaluate "foo" code;
            loop()
        end

    fun main () = 
        let
            val port = case CommandLine.arguments() of
                    nil => raise Error "port of the server not provided"
                  | n::_ => valOf (Int.fromString n)
            val client_sock = mkSock(port);
            val _ = (gsock := SOME client_sock);
        in
            PolyML.fullGC();
            map PolyML.Compiler.forgetStructure["PolyMLext"];
            loop();
            closeSock(client_sock);
            OS.Process.exit OS.Process.success
        end
        
end;

use "js.ml";
open Js;
