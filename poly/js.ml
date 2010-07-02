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
            val _ = ext.send("a = document.getElementById(\""^e^"\").innerHTML");
        in
            ext.recv()
        end
    *)
    
    fun js code =
        let
            val _ = ext.send("{\"type:2\", \"code\":\""^code^"\"}")
        in
            ext.recv()
        end
        
    fun addEventListener elem eventType f =
        let
            val _ = ext.send("{\"type:3\", \"elem\":\""^elem^"\", eventType:\""^eventType^"\", f:\""^f^"\"}")
        in
            ext.recv()
        end
        
end;
