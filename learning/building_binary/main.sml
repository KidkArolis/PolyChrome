structure PolyMLext (*: POLYMLEXT*)
= struct

    val socket1 = ref (NONE : Socket.active INetSock.stream_sock option)
    val socket2 = ref (NONE : Socket.active INetSock.stream_sock option)

    val PREFIX_SIZE = 9;
    val CHUNK_SIZE = 65536;

    exception Error of string

    fun the (reference) = Option.valOf (!reference)

    fun escape_quotes s =
            implode (foldr op@ [] (map (fn #"\"" => [#"\\", #"\""] | x => [x]) (explode s)));

    fun makeSocket (port) =
        let
            val client = INetSock.TCP.socket()
            val me = valOf (NetHostDB.getByName "localhost")
            val localhost = NetHostDB.addr me
            val _ = Socket.connect(client,INetSock.toAddr(localhost, port))
            val _ = INetSock.TCP.setNODELAY(client,true)
        in
            client
        end
        
    fun recv_ (socket) =
        let
            val prefix = Byte.bytesToString(
                    Socket.recvVec(socket, PREFIX_SIZE))
            val length = valOf (Int.fromString prefix)
            fun recvLoop (0) = ""
              | recvLoop (length) =
                let
                    val len = if (length<CHUNK_SIZE)
                            then length
                            else CHUNK_SIZE;
                    val vectorReceived = Socket.recvVec(socket, len);
                    val nbytes = Word8Vector.length vectorReceived;
                    val chunk = Byte.bytesToString(vectorReceived);
                in
                    chunk ^ recvLoop(length-nbytes)
                end
            val data = recvLoop(length)
        in
            data
        end

    fun recv1 () = recv_ (the socket1)
    fun recv2 () = recv_ (the socket2)

    fun expand (str, 9) = str
              | expand (str, x) = expand (str^" ", x+1);
              
    fun send (data) =
        let
            val prefix = Int.toString (size data)
            val prefix = expand (prefix, size prefix)
            val prefixed_data = prefix^data
            val length = size prefixed_data
            fun sendLoop (pos) =
                let
                    val len = if ((pos+CHUNK_SIZE) > length)
                            then length-pos
                            else CHUNK_SIZE
                    val chunk = substring (prefixed_data, pos, len)
                    val outv = Word8VectorSlice.full
                            (Byte.stringToBytes chunk)
                    val nbytes = Socket.sendVec(the socket1, outv)
                in
                    if pos+nbytes>=length then 0 else sendLoop(pos+nbytes)
                end
                
            val _ = print (Int.toString(length)^"\n");
        in
            sendLoop(0)
        end

    fun closeSock s =
        (Socket.shutdown(s,Socket.NO_RECVS_OR_SENDS);
         Socket.close s)

    fun evaluate location_url txt =
        let
            (* uses input and output buffers for compilation and output message *)
            val in_buffer = ref (String.explode txt)
            val out_buffer = ref ([]: string list);;
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

               (* the following catches any output durin
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
               (false, (put ("Exception - " ^ General.exnMessage exn ^ " raised"); ()
                (* Can do other stuff here: e.g. raise exn *) ));

              (* finally, print out any messages in the output buffer *)
            val output_string = output();
        in
            if worked then send("{\"type\":0, \"output\":\""^(escape_quotes output_string)^"\"}")
            else send("{\"type\":1, \"output\":\""^(escape_quotes output_string)^"\"}")
        end;

    fun loop () =
        let
            val code = recv1();
        in
            evaluate "foo" code;
            loop()
        end

    fun main () =
        let
            val (socket1port, socket2port) = case CommandLine.arguments() of
                  [n,m] => (valOf (Int.fromString n), valOf (Int.fromString m))
                  | x => raise Error "ports not provided"
            val _ = (socket1 := (SOME (makeSocket socket1port)));
            val _ = (socket2 := (SOME (makeSocket socket2port)));

        in
            (*PolyML.fullGC();*)
            (*map PolyML.Compiler.forgetStructure["PolyMLext"];*)
            loop();
            closeSock (the socket1);
            closeSock (the socket2);
            OS.Process.exit OS.Process.success
        end

end;

val temp = ref ([]:string list);

use "js.sml";
open Js;
