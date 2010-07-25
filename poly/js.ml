(*signature JS =*)
(*sig*)
(*end*)

structure Js =
struct
    (*helpers*)
    fun json2 [t, a1]
            = "{\"type\":"^t^", \"arg1\":\""^a1^"\"}"
      | json2 [t, a1, a2]
            = "{\"type\":"^t^", \"arg1\":\""^a1^"\", \"arg2\":\""^a2^"\"}"
      | json2 [t, a1, a2, a3]
            = "{\"type\":"^t^", \"arg1\":\""^a1^"\", \"arg2\":\""^a2^"\", \"arg3\":\""^a3^"\"}"
      | json2 [t, a1, a2, a3, a4]
            = "{\"type\":"^t^", \"arg1\":\""^a1^"\", \"arg2\":\""^a2^"\", \"arg3\":\""^a3^"\", \"arg4\":\""^a4^"\"}";

    fun json [w,a1]
            = "{\"type\":5, \"wrapper\":\""^w^"\", \"arg1\":\""^a1^"\"}"
      | json [w, a1, a2]
            = "{\"type\":5, \"wrapper\":\""^w^"\", \"arg1\":\""^a1^"\", \"arg2\":\""^a2^"\"}"
      | json [w, a1, a2, a3]
            = "{\"type\":5, \"wrapper\":\""^w^"\", \"arg1\":\""^a1^"\", \"arg2\":\""^a2^"\", \"arg3\":\""^a3^"\"}"
      | json [w, a1, a2, a3, a4]
            = "{\"type\":5, \"wrapper\":\""^w^"\", \"arg1\":\""^a1^"\", \"arg2\":\""^a2^"\", \"arg3\":\""^a3^"\", \"arg4\":\""^a4^"\"}"
      | json [w, a1, a2, a3, a4, a5]
            = "{\"type\":5, \"wrapper\":\""^w^"\", \"arg1\":\""^a1^"\", \"arg2\":\""^a2^"\", \"arg3\":\""^a3^"\", \"arg4\":\""^a4^"\", \"arg5\":\""^a5^"\"}"
      | json [w, a1, a2, a3, a4, a5, a6]
            = "{\"type\":5, \"wrapper\":\""^w^"\", \"arg1\":\""^a1^"\", \"arg2\":\""^a2^"\", \"arg3\":\""^a3^"\", \"arg4\":\""^a4^"\", \"arg5\":\""^a5^"\", \"arg6\":\""^a6^"\"}"
      | json [w, a1, a2, a3, a4, a5, a6, a7]
            = "{\"type\":5, \"wrapper\":\""^w^"\", \"arg1\":\""^a1^"\", \"arg2\":\""^a2^"\", \"arg3\":\""^a3^"\", \"arg4\":\""^a4^"\", \"arg5\":\""^a5^"\", \"arg6\":\""^a6^"\", \"arg7\":\""^a7^"\"}"
      | json [w, a1, a2, a3, a4, a5, a6, a7, a8]
            = "{\"type\":5, \"wrapper\":\""^w^"\", \"arg1\":\""^a1^"\", \"arg2\":\""^a2^"\", \"arg3\":\""^a3^"\", \"arg4\":\""^a4^"\", \"arg5\":\""^a5^"\", \"arg6\":\""^a6^"\", \"arg7\":\""^a7^"\", \"arg8\":\""^a8^"\"}";

    (*DOM*)
    type elem = string;
    type doc = string;

    val document = "document":doc;

    (* execute arbitrary javascript code  *)
    fun eval code = let
            val code = PolyMLext.escape_quotes(code);
            val _ = PolyMLext.send(json2 ["2", code])
        in PolyMLext.recv2() end

    (* element manipulation *)
    fun documentElement (d:doc) = "document":elem;

    fun getElementById (d:doc) (id:string) = let
            val _ = PolyMLext.send(json2 ["3", "getElementById", id]);
            val response = PolyMLext.recv2();
            val result = case response of "null" => NONE | x => SOME (x:elem);
        in result end

    fun childNodes (e:elem) = let
            val _ = PolyMLext.send(json2 ["3", "childNodes", e]);
            val response = PolyMLext.recv2();
            val _ = PolyMLext.evaluate "eval" ("val _ = (temp:="^response^");");
        in !temp end

    fun parentNode (e:elem) = let
            val _ = PolyMLext.send(json2 ["3", "parentNode", e]);
            val response = PolyMLext.recv2();
            val result = case response of "null" => NONE | x => SOME (x:elem);
        in result end

    fun firstChild (e:elem) = let
            val _ = PolyMLext.send(json2 ["3", "firstChild", e]);
            val response = PolyMLext.recv2();
            val result = case response of "null" => NONE | x => SOME (x:elem);
        in result end

    fun lastChild (e:elem) = let
            val _ = PolyMLext.send(json2 ["3", "lastChild", e]);
            val response = PolyMLext.recv2();
            val result = case response of "null" => NONE | x => SOME (x:elem);
        in result end

    fun nextSibling (e:elem) = let
            val _ = PolyMLext.send(json2 ["3", "nextSibling", e]);
            val response = PolyMLext.recv2();
            val result = case response of "null" => NONE | x => SOME (x:elem);
        in result end

    fun previousSibling (e:elem) = let
            val _ = PolyMLext.send(json2 ["3", "previousSibling", e]);
            val response = PolyMLext.recv2();
            val result = case response of "null" => NONE | x => SOME (x:elem);
        in result end

    fun innerHTML (e:elem) (html:string option) = let
            val req = case html of
                NONE   => json2 ["3", "innerHTML", e]
              | SOME s => json2 ["3", "innerHTML", e, s];
            val _ = PolyMLext.send(req);
        in PolyMLext.recv2() end

    fun value (e:elem) (value:string option) = let
            val req = case value of
                NONE   => json2 ["3", "value", e]
              | SOME s => json2 ["3", "value", e, s];
            val _ = PolyMLext.send(req);
        in PolyMLext.recv2() end

    fun getAttribute (e:elem) (attribute:string)= let
            val _ = PolyMLext.send(json2 ["3", "getAttribute", e, attribute]);
        in PolyMLext.recv2() end

    fun setAttribute (e:elem) (attribute:string) (value:string) = let
            val _ = PolyMLext.send(json2 ["3", "setAttribute", e, attribute, value]);
        in () end

    fun removeAttribute (e:elem) (attribute:string) = let
            val _ = PolyMLext.send(json2 ["3", "removeAttribute", e, attribute]);
        in () end

    fun createElement (t:string) = let
            val _ = PolyMLext.send(json2 ["3", "createElement", t]);
        in PolyMLext.recv2():elem end

    fun createTextNode (text:string) = let
            val _ = PolyMLext.send(json2 ["3", "createTextNode", text]);
        in PolyMLext.recv2():elem end

    (*fun createFragment  : unit -> elem*)

    fun appendChild (parent:elem) (child:elem) = let
            val _ = PolyMLext.send(json2 ["3", "appendChild", parent, child]);
        in () end

    fun removeChild (parent:elem) (child:elem) = let
            val _ = PolyMLext.send(json2 ["3", "removeChild", parent, child]);
        in () end

    fun replaceChild (parent:elem) (child_from:elem) (child_to:elem) = let
            val _ = PolyMLext.send(json2 ["3", "replaceChild", parent, child_from, child_to]);
        in () end

    fun style (e:elem) (attribute:string) (value:string option) = let
            val req = case value of
                        NONE => json2 ["3", "style", e, attribute]
                      | SOME s => json2 ["3", "style", e, attribute, s];
            val _ = PolyMLext.send(req);
        in PolyMLext.recv2() end

    (* events *)
    datatype eventType = click | change | keypress | keyup | mouseover | mouseout | mousemove;
    fun addEventListener (e:elem) et f = let
            val _ = PolyMLext.send(json2 ["4", "addEventListener", e, et, f]);
        in () end
    fun removeEventListener (e:elem) et f = let
            val _ = PolyMLext.send(json2 ["4", "removeEventListener", e, et, f]);
        in () end
    (*timers*)
    fun setInterval (f:string) (time:int) = let
            val _ = PolyMLext.send(json2 ["4", "setInterval", f, (Int.toString time)]);
        in () end

    (*Memory management*)
    (**
    TODO:
    fun clearElement (e:elem)
    *)
    fun clearMemory (ns:string option) = let
            val req = case ns of
                        NONE => json2 ["3", "clearMemory"]
                      | SOME s => json2 ["3", "clearMemory", s];
            val _ = PolyMLext.send(req);
        in () end

    fun switchNamespace (ns:string option) = let
            val req = case ns of
                        NONE => json2 ["3", "switchNamespace"]
                      | SOME s => json2 ["3", "switchNamespace", s];
            val _ = PolyMLext.send(req);
        in () end
end;

