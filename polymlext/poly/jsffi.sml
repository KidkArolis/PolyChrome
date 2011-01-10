signature JSFFI =
sig
    type fptr
    structure Tab : NAME_TAB
    structure Name : SSTR_NAMES
    
    (* this is used in combination with the exec_js_r and exec_js*)
    structure arg :
    sig
        val string : string -> JSON.T list
        val reference : fptr -> JSON.T list
        val real : real -> JSON.T list
        val object : JSON.T -> JSON.T list
        val null : unit -> JSON.T list
        val list : JSON.T list -> JSON.T list
        val int : int -> JSON.T list
        val callback : string -> JSON.T list
        val bool : bool -> JSON.T list
    end
    
    (* this is the only way of calling JS functions *)
    (* when using exec_js_r, it is up to the implementation of the wrapper
    function to conver the returned string appropriately *)
    val exec_js_r : string -> string -> JSON.T list list -> string
    val exec_js : string -> string -> JSON.T list list -> unit
    val exec_js_get : string -> string -> JSON.T list list -> string
    val exec_js_set : string -> string -> JSON.T list list -> unit
    val exec_js_new : string -> string -> JSON.T list list -> string
    (* this has to be sent to JS after handling each event *)
    val ready : unit -> unit
    
    (* these are used for keeping the temporary memory, used for
    storing javascript objects, tidy *)
    structure Memory :
    sig
        val switchNs : string -> unit
        val switchDefaultNs : unit -> unit
        val addFunctionReference : string -> fptr
        val addFunctionReferenceOW : string -> fptr
        val removeReference : string -> unit
        val deleteNs : string -> unit
        val clearNs : string -> unit
        val clearDefaultNs : unit -> unit
    end
    
    exception Error of unit
end

structure jsffi : JSFFI =
struct

    exception Error of unit
    
    type fptr = string

    structure Name = SStrName;
    structure Tab = Name.NTab;
    
    structure arg = struct
        fun string x = [JSON.String x, JSON.String "string"]
        fun real x = [JSON.Real x, JSON.String "float"]
        fun bool x = [JSON.Bool x, JSON.String "bool"]
        fun int x = [JSON.Int x, JSON.String "int"]
        fun list x = [JSON.List x, JSON.String "array"]
        fun object x = [x, JSON.String "object"]
        fun callback x = [JSON.String x, JSON.String "callback"]
        fun null () = [JSON.Null, JSON.String "null"]
        fun reference x = [JSON.String x, JSON.String "reference"]
    end
    
    fun send (m) = PolyMLext.send_request m
    fun recv () = PolyMLext.recv_response ()
    
    fun JSONReq t obj f r args = JSON.empty
            |> JSON.add ("type", JSON.Int t)
            |> JSON.add ("obj", JSON.String obj)
            |> JSON.add ("f", JSON.String f)
            |> JSON.add ("r", JSON.Bool r)
            |> JSON.add ("args", JSON.List (map (fn (x) => JSON.List (x)) args))
    fun JSONReqStr t obj f r args  = JSON.encode (JSONReq t obj f r args)
    
    fun exec_js obj f args = send (JSONReqStr 2 obj f false args)
    fun exec_js_r obj f args = (send (JSONReqStr 2 obj f true args); recv())
    fun exec_js_set obj f args = send (JSONReqStr 3 obj f false args);
    fun exec_js_get obj f args = (send (JSONReqStr 3 obj f true args); recv())
    fun exec_js_new obj f args = (send (JSONReqStr 6 obj f true args); recv())
    
    val readySignal = JSON.encode (JSON.empty
            |> JSON.add ("type", JSON.Int 5)
            |> JSON.add ("r", JSON.Bool false))
    fun ready () = send readySignal
    
    (*Memory management*)
    fun JSONReq2 f r args =
        let
            val x = JSON.empty
                 |> JSON.add ("type", JSON.Int 4) 
                 |> JSON.add ("f", JSON.String f)
                 |> JSON.add ("r", JSON.Bool r)
        in
            foldl (fn (v, tab) => JSON.add ("arg1", v) tab) x args
        end
    fun JSONReqStr2 f r args = JSON.encode (JSONReq2 f r args)
    structure Memory = struct
        fun addFunctionReference f = let
                val _ = send(JSONReqStr2 "addFunctionReference" true [JSON.String f])
            in recv() end
        (* add a function reference that will be used as a callback and is
        overwritable in the event queue *)
        fun addFunctionReferenceOW f = let
                val _ = send(JSONReqStr2 "addFunctionReference" true [JSON.String f, JSON.Bool true])
            in recv() end
        fun removeReference r = let
                val req = JSONReqStr2 "removeReference" false [JSON.String r]
            in send(req) end
        fun switchDefaultNs () = let
                val req = JSONReqStr2 "switchDefaultNs" false []
            in send(req) end
        fun switchNs (ns) = let
                val req = JSONReqStr2 "switchNs" false [JSON.String ns]
            in send(req) end
        fun clearDefaultNs () = let
                val req = JSONReqStr2 "clearDefaultNs" false []
            in send(req) end
        fun clearNs (ns) = let
                val req = JSONReqStr2 "clearNs" false [JSON.String ns]
            in send(req) end
        fun deleteNs (ns) = let
                val req = JSONReqStr2 "deleteNs" false [JSON.String ns]
            in send(req) end
    end
    
end;