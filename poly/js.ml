(*
signature JS = 
  sig
    (* dom *)
    eqtype elem
    (*val document        : doc*)
(*    val getElementById  : doc -> string -> elem option*)
    val innerHTML       : elem -> string
  end
*)
  
structure Js =
struct
    (*
    type elem = string
    (*val document = doc;*)

    fun getElementById (id:string) : elem option =
        NONE;
             
    fun innerHTML (e:elem) =
        let
            val _ = PolyMLext.send("a = document.getElementById(\""^e^"\").innerHTML");
        in
            PolyMLext.recv()
        end
    *)
    
    (*helpers*)
    fun implode list = foldr op^ "" list;
    
    type elem = string * string list
    
    fun eval code =
        let
            val _ = PolyMLext.send("{\"type\":2, \"code\":\""^(PolyMLext.escape_quotes(code))^"\"}")
        in
            PolyMLext.recv()
        end
        
    fun exec ((id, operations):elem) =
        let
            val _ = PolyMLext.send("{\"type\":3, \"id\":\""^id^"\", \"operations\":\""^(implode(operations))^"\"}");
        in
            PolyMLext.recv()
        end;

    fun addEventListener elem eventType f =
        let
            val _ = PolyMLext.send("{\"type\":4, \"elem\":\""^elem^"\", \"eventType\":\""^eventType^"\", \"f\":\""^f^"\"}");
        in
            PolyMLext.recv()
        end
        
    fun removeEventListener elem eventType f =
        let
            val _ = PolyMLext.send("{\"type\":5, \"elem\":\""^elem^"\", \"eventType\":\""^eventType^"\", \"f\":\""^f^"\"}");
        in
            PolyMLext.recv()
        end
        
    fun onMouseMove elem f =
        let
            val _ = PolyMLext.send("{\"type\":6, \"elem\":\""^elem^"\", \"f\":\""^f^"\"}");
        in
            PolyMLext.recv()
        end
        
    fun getElementById id = (id, []):elem;    
    fun parentNode ((id, operations):elem) = (id, operations@["parentNode."]):elem;
    fun firstChild ((id, operations):elem) = (id, operations@["firstChild."]):elem;
    
    fun innerHTML ((id, operations):elem) (newValue:string option) = 
        let
            val operations = operations@["innerHTML"];
            val _ = PolyMLext.send("{\"type\":3, \"id\":\""^id^"\", \"operations\":\""^(implode(operations))^"\"}");
        in
            PolyMLext.recv()
        end;
        
    fun innerHTMLexample (newValue:string option) =
        let
            val operations = case newValue of NONE => "innerHTML" | SOME s => "innerHTML = '"^s^"'"
        in
            print (operations^"\n")
        end;

(*  val getElementById  : doc -> string -> elem option*)
(*  val parent          : elem -> elem option*)
(*  val firstChild      : elem -> elem option*)
(*  val lastChild       : elem -> elem option*)
(*  val nextSibling     : elem -> elem option*)
(*  val previousSibling : elem -> elem option*)
(*  val innerHTML       : elem -> string -> unit*)
(*  val value           : elem -> string*)
(*  val setAttribute    : elem -> string -> string -> unit*)
(*  val removeAttribute : elem -> string -> unit*)
(*  val createElement   : string -> elem*)
(*  val createTextNode  : string -> elem*)
(*  val createFragment  : unit -> elem*)
(*  val appendChild     : elem -> elem -> unit*)
(*  val removeChild     : elem -> elem -> unit*)
(*  val replaceChild    : elem -> elem -> elem -> unit*)
(*  val setStyle        : elem -> string * string -> unit*)
        
(*val onMouseMove         : doc -> (int*int -> unit) -> unit*)


(*what about these*)
(*  type intervalId*)
(*  val setInterval     : int -> (unit -> unit) -> intervalId*)
(*  val clearInterval   : intervalId -> unit*)

(*  type timeoutId*)
(*  val setTimeout      : int -> (unit -> unit) -> timeoutId*)
(*  val clearTimeout    : timeoutId -> unit*)

(*  structure XMLHttpRequest : sig*)
(*    type req*)
(*    val new              : unit -> req*)
(*    val openn            : req -> {method: string, url: string, async: bool} -> unit*)
(*    val setRequestHeader : req -> string * string -> unit*)
(*    val send             : req -> string option -> unit*)
(*    val state            : req -> int        (* 0,1,2,3,4 *)*)
(*    val status           : req -> int option (* 200, 404, ... *)*)
(*    val onStateChange    : req -> (unit -> unit) -> unit*)
(*    val response         : req -> string option*)
(*    val abort            : req -> unit*)
(*  end *)

end;
