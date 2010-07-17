(*signature JS =*)
(*sig*)
(*end*)

structure Js =
struct
    (*helpers*)
    fun json [t, a1]
            = "{\"type\":"^t^", \"arg1\":\""^a1^"\"}"
      | json [t, a1, a2]
            = "{\"type\":"^t^", \"arg1\":\""^a1^"\", \"arg2\":\""^a2^"\"}"
      | json [t, a1, a2, a3]
            = "{\"type\":"^t^", \"arg1\":\""^a1^"\", \"arg2\":\""^a2^"\", \"arg3\":\""^a3^"\"}"
      | json [t, a1, a2, a3, a4]
            = "{\"type\":"^t^", \"arg1\":\""^a1^"\", \"arg2\":\""^a2^"\", \"arg3\":\""^a3^"\", \"arg4\":\""^a4^"\"}"

    (*DOM*)
    type elem = string;
    type doc = string;

    val document = "document":doc;

    (* execute arbitrary javascript code  *)
    fun eval code = let
            val code = PolyMLext.escape_quotes(code);
            val _ = PolyMLext.send(json ["2", code])
        in PolyMLext.recv2() end

    (* element manipulation *)
    fun documentElement (d:doc) = "document":elem;

    fun getElementById (d:doc) (id:string) = let
            val _ = PolyMLext.send(json ["3", "getElementById", id]);
            val response = PolyMLext.recv2();
            val result = case response of "null" => NONE | x => SOME (x:elem);
        in result end

    fun parentNode (e:elem) = let
            val _ = PolyMLext.send(json ["3", "parentNode", e]);
            val response = PolyMLext.recv2();
            val result = case response of "null" => NONE | x => SOME (x:elem);
        in result end

    fun firstChild (e:elem) = let
            val _ = PolyMLext.send(json ["3", "firstChild", e]);
            val response = PolyMLext.recv2();
            val result = case response of "null" => NONE | x => SOME (x:elem);
        in result end

    fun lastChild (e:elem) = let
            val _ = PolyMLext.send(json ["3", "lastChild", e]);
            val response = PolyMLext.recv2();
            val result = case response of "null" => NONE | x => SOME (x:elem);
        in result end

    fun nextSibling (e:elem) = let
            val _ = PolyMLext.send(json ["3", "nextSibling", e]);
            val response = PolyMLext.recv2();
            val result = case response of "null" => NONE | x => SOME (x:elem);
        in result end

    fun previousSibling (e:elem) = let
            val _ = PolyMLext.send(json ["3", "previousSibling", e]);
            val response = PolyMLext.recv2();
            val result = case response of "null" => NONE | x => SOME (x:elem);
        in result end

    fun innerHTML (e:elem) (html:string option) = let
            val req = case html of
                NONE   => json ["3", "innerHTML", e]
              | SOME s => json ["3", "innerHTML", e, s];
            val _ = PolyMLext.send(req);
        in PolyMLext.recv2() end

    fun value (e:elem) (value:string option) = let
            val req = case value of
                NONE   => json ["3", "value", e]
              | SOME s => json ["3", "value", e, s];
            val _ = PolyMLext.send(req);
        in PolyMLext.recv2() end

    fun getAttribute (e:elem) (attribute:string)= let
            val _ = PolyMLext.send(json ["3", "getAttribute", e, attribute]);
        in PolyMLext.recv2() end

    fun setAttribute (e:elem) (attribute:string) (value:string) = let
            val _ = PolyMLext.send(json ["3", "setAttribute", e, attribute, value]);
        in () end

    fun removeAttribute (e:elem) (attribute:string) = let
            val _ = PolyMLext.send(json ["3", "removeAttribute", e, attribute]);
        in () end

    fun createElement (t:string) = let
            val _ = PolyMLext.send(json ["3", "createElement", t]);
        in PolyMLext.recv2():elem end

    fun createTextNode (text:string) = let
            val _ = PolyMLext.send(json ["3", "createTextNode", text]);
        in PolyMLext.recv2():elem end

    (*fun createFragment  : unit -> elem*)

    fun appendChild (parent:elem) (child:elem) = let
            val _ = PolyMLext.send(json ["3", "appendChild", parent, child]);
        in () end

    fun removeChild (parent:elem) (child:elem) = let
            val _ = PolyMLext.send(json ["3", "removeChild", parent, child]);
        in () end

    fun replaceChild (parent:elem) (child_from:elem) (child_to:elem) = let
            val _ = PolyMLext.send(json ["3", "replaceChild", parent, child_from, child_to]);
        in () end

    fun style (e:elem) (attribute:string) (value:string option) = let
            val req = case value of
                        NONE => json ["3", "style", attribute]
                      | SOME s => json ["3", "style", attribute, s];
            val _ = PolyMLext.send(req);
        in PolyMLext.recv2() end

    (* events *)
    datatype eventType = click | change | keypress | keyup | mouseover | mouseout | mousemove;
    fun addEventListener (e:elem) et f = let
            val _ = PolyMLext.send(json ["4", "addEventListener", e, et, f]);
        in () end
    fun removeEventListener (e:elem) et f = let
            val _ = PolyMLext.send(json ["4", "removeEventListener", e, et, f]);
        in () end

    (*Memory management*)
    (**
    TODO:
    fun clearElement (e:elem)
    *)
    fun clearMemory () = let
            val _ = PolyMLext.send(json ["3", "clearMemory"]);
        in () end
end;

