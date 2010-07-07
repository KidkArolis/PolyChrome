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
    
    fun js code =
        let
            val _ = PolyMLext.send("{\"type\":2, \"code\":\""^(PolyMLext.escape_quotes code)^"\"}")
        in
            PolyMLext.recv()
        end

    fun addEventListener elem eventType f =
        let
        in
        PolyMLext.send("{\"type\":3, \"elem\":\""^elem^"\", \"eventType\":\""^eventType^"\", \"f\":\""^f^"\"}");
        PolyMLext.recv()
        end
        
    fun removeEventListener elem eventType f =
        let
        in
        PolyMLext.send("{\"type\":4, \"elem\":\""^elem^"\", \"eventType\":\""^eventType^"\", \"f\":\""^f^"\"}");
        PolyMLext.recv()
        end
end;
