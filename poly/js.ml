(*signature JS =*)
(*sig*)
(*end*)

structure Js =
struct
    type elem = string;
    type doc = string;

    val document = "document":doc;

    (* execute arbitrary javascript code  *)
    fun eval code = let
            val _ = PolyMLext.send("{\"type\":2, \"code\":\""^(PolyMLext.escape_quotes(code))^"\"}")
        in PolyMLext.recv2() end

    (* element manipulation *)
    fun documentElement (d:doc) = "document":elem;

    fun getElementById (d:doc) (id:string) = let
            val _ = PolyMLext.send("{\"type\":3, \"op\":\"getElementById\",\"id\":\""^id^"\"}");
            val response = PolyMLext.recv2();
            val result = case response of "null" => NONE | x => SOME (x:elem);
        in result end

    fun parent (e:elem) = let
            val _ = PolyMLext.send("{\"type\":3, \"op\":\"parent\"}");
            val response = PolyMLext.recv2();
            val result = case response of "null" => NONE | x => SOME (x:elem);
        in result end
    fun firstChild (e:elem) = let
            val _ = PolyMLext.send("{\"type\":3, \"op\":\"firstChild\"}");
            val response = PolyMLext.recv2();
            val result = case response of "null" => NONE | x => SOME (x:elem);
        in result end
    fun lastChild (e:elem) = let
            val _ = PolyMLext.send("{\"type\":3, \"op\":\"lastChild\"}");
            val response = PolyMLext.recv2();
            val result = case response of "null" => NONE | x => SOME (x:elem);
        in result end
    fun nextSibling (e:elem) = let
            val _ = PolyMLext.send("{\"type\":3, \"op\":\"nextSibling\"}");
            val response = PolyMLext.recv2();
            val result = case response of "null" => NONE | x => SOME (x:elem);
        in result end
    fun previousSibling (e:elem) = let
            val _ = PolyMLext.send("{\"type\":3, \"op\":\"previousSibling\"}");
            val response = PolyMLext.recv2();
            val result = case response of "null" => NONE | x => SOME (x:elem);
        in result end
    fun innerHTML (e:elem) (html:string option) = let
            val req = case html of
                NONE   => "{\"type\":3,\"op\":\"innerHTML\",\"arg1\":\""^e^"\"}"
              | SOME h => "{\"type\":3,\"op\":\"innerHTML\",\"arg1\":\""^e^"\",\"arg2\":\""^h^"\"}"
            val _ = PolyMLext.send(req);
(*            val _ = PolyMLext.send("{\"type\":2,\"code\":\"console.log('waiting for innerhtml')\"}");*)
        in PolyMLext.recv2() end
    fun value (e:elem) (value:string option) = let
            val req = case value of
                NONE   => "{\"type\":3,\"op\":\"value\",\"arg1\":\""^e^"\"}"
              | SOME s => "{\"type\":3,\"op\":\"value\",\"arg1\":\""^e^"\",\"arg2\":\""^s^"\"}";
            val _ = PolyMLext.send(req);
        in PolyMLext.recv2() end
    fun getAttribute (e:elem) (attribute:string)= let
            val _ = PolyMLext.send("{\"type\":3,\"op\":\"getAttribute\",\"eid\":\""^e^"\",\"attribute\":"^attribute^"}");
        in PolyMLext.recv2() end
    fun setAttribute (e:elem) (attribute:string) (value:string) = let
            val _ = PolyMLext.send("{\"type\":3,\"op\":\"setAttribute\",\"eid\":\""^e^"\",\"attribute\":"^attribute^",\"value\":\""^value^"\"}");
        in () end
    fun removeAttribute (e:elem) (attribute:string) = let
            val _ = PolyMLext.send("{\"type\":3,\"op\":\"removeAttribute\",\"eid\":\""^e^"\",\"attribute\":"^attribute^"}");
        in () end
    fun createElement (t:string) = let
            val _ = PolyMLext.send("{\"type\":3,\"op\":\"createElement\",\"type\":"^t^"}");
        in PolyMLext.recv2():elem end
    fun createTextNode (text:string) = let
            val _ = PolyMLext.send("{\"type\":3,\"op\":\"createTextNode\",\"text\":"^text^"}");
        in PolyMLext.recv2():elem end
(*    fun createFragment  : unit -> elem*)
    fun appendChild (parent:elem) (child:elem) = let
            val _ = PolyMLext.send("{\"type\":3,\"op\":\"appendChild\",\"pid\":"^parent^",\"cid\":"^child^"}");
        in () end
    fun removeChild (parent:elem) (child:elem) = let
            val _ = PolyMLext.send("{\"type\":3,\"op\":\"removeChild\",\"pid\":"^parent^",\"cid\":"^child^"}");
        in () end
    fun replaceChild (parent:elem) (child_from:elem) (child_to:elem) = let
            val _ = PolyMLext.send("{\"type\":3,\"op\":\"replaceChild\",\"pid\":"^parent^",\"cid_from\":"^child_from^",\"cid_to\":"^child_to^"}");
        in () end
    fun style (e:elem) (attribute:string) (value:string option) = let
            val setValue = case value of NONE => "false" | SOME s => "true";
            val value = case value of NONE => "" | SOME s => s;
            val _ = PolyMLext.send("{\"type\":3,\"op\":\"style\",\"eid\":\""^e^"\",\"setValue\":"^setValue^",\"value\":\""^value^"\"}");
        in PolyMLext.recv2() end

    (* events *)
    datatype eventType = onclick | onchange | onkeypress | onkeyup | onmouseover | onmouseout;
    fun addEventListener (e:elem) et f = let
            val _ = PolyMLext.send("{\"type\":4, \"op\":\"addEventListener\", \"eid\":\""^e^"\", \"eventType\":\""^et^"\", \"f\":\""^f^"\"}");
        in () end
    fun removeEventListener (e:elem) et f = let
            val _ = PolyMLext.send("{\"type\":4, \"op\":\"removeEventListener\", \"eid\":\""^e^"\", \"eventType\":\""^et^"\", \"f\":\""^f^"\"}");
        in () end
    fun onMouseMove e f = let
            val _ = PolyMLext.send("{\"type\":4, \"op\":\"onMouseMove\", \"elem\":\""^e^"\", \"f\":\""^f^"\"}");
        in () end

    (*Memory management*)
    (**
    TODO:
    fun clearElement (e:elem)
    *)
    fun clearMemory () = let
             val _ = PolyMLext.send("{\"type\":3,\"op\":\"clearMemory\"}");
        in () end
end;

