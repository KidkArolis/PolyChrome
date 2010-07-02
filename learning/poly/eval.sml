(* Example evaluation function: use PolyML's compiler to evaluate a 
   string in ML *)

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
      [(** keep track of line numbers **)
       PolyML.Compiler.CPLineNo (fn () => ! current_line),

       (** the following catches any output during 
          compilation/evaluation and store it in the put stream. **)
       PolyML.Compiler.CPOutStream put,
       
       (** the following handles error messages specially 
          to say where they come from in the error message into 
          the put stream. **)
       PolyML.Compiler.CPErrorMessageProc put_message
      ]

    val (worked,_) = 
      (true, while not (List.null (! in_buffer)) do 
             PolyML.compiler (get, compile_params) ())
      handle exn => (* something went wrong... *)
       (false, (put ("Exception- " ^ General.exnMessage exn ^ " raised"); ()
        (* Can do other stuff here: e.g. raise exn *) ));

  (* finally, print out any messages in the output buffer *)
  in if worked then TextIO.print ("AllGOOD: " ^ (output ()))
     else TextIO.print ("PANTS!: " ^ (output ()))
  end;


map PolyML.Compiler.forgetStructure
  ["TextIO", "BinIO", "BinPrimIO", "PolyML", "ImperativeIO", "StreamIO",
 "PrimIO", "Posix", "Windows"];

(* some examples. *)
(* this one works fine *)
val _ = evaluate "http://foo/blah1" "PolyML.print \"hi!\";";

(* this one goes wrong *)
val _ = evaluate "http://foo/blah2" "\n\nPolyML.prisnt \"hi!\";";

val x = TextIO.print;
