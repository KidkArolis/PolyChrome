(*signature JS =*)
(*sig*)
(*end*)

structure Name = SStrName;
structure Tab = Name.NTab;

structure DOMInternal =
struct
    
end;

structure DOM =
struct
    (*helpers*)    
    val DOMWrapperJSON = JSON.empty
                      |> JSON.add ("type", JSON.Int 2);
    val CustomWrapperJSON = JSON.empty
                         |> JSON.add ("type", JSON.Int 3);
    
    (*this one is used internally for all default DOM functions *)
    fun JSONReq2 f args =
        let
            val x = JSON.add ("f", JSON.String f) DOMWrapperJSON
        in
            foldl (fn (v, tab) => JSON.add ("arg1", v) tab) x args
        end
    fun JSONReqStr2 f args = JSON.encode (JSONReq2 f args)
    
    (*this one is used for custom wrappers *)
    fun JSONReq wrapper_name f args =
        let
            val x = JSON.add ("f", JSON.String f) CustomWrapperJSON
                 |> JSON.add ("w", JSON.String wrapper_name);
        in
            foldl (fn (v, tab) => JSON.add ("arg1", v) tab) x args
        end
    fun JSONReqStr wrapper_name f args = JSON.encode (JSONReq wrapper_name f args)
    

    (*DOM*)
    type elem = string;
    type doc = string;
    
    
    datatype eventType = click | change | keypress | keyup | mouseover | mouseout | mousemove;

    fun string_of_eventtype click = "click"
      | string_of_eventtype change = "change"
      | string_of_eventtype keypress = "keypress"
      | string_of_eventtype keyup = "keyup"
      | string_of_eventtype mouseover = "mouseover"
      | string_of_eventtype mouseout = "mouseout"
      | string_of_eventtype mousemove = "mousemove";
    
    datatype eventHandler = EventHandler of string -> unit;
    datatype timerHandler = TimerHandler of unit -> unit;
    
    (* memory *)
    (* we'll keep event handlers here *)
    val eventHandlerTab = ref (Tab.empty : (elem * eventType * eventHandler) Tab.T)
    fun handle_event (id:string) (eventData:string) = let
            val (_, _, EventHandler f) = Tab.get (!eventHandlerTab) (Name.mk id)
        in f(eventData) end;
    
    (* we'll keep timer callbacks here *)
    val timerHandlerTab = ref (Tab.empty : (int * timerHandler) Tab.T)
    fun handle_timer (id:string) = let
            val (_, TimerHandler f) = Tab.get (!timerHandlerTab) (Name.mk id)
        in f() end;


    val document = "document":doc;

    (* element manipulation *)
    fun documentElement (d:doc) = "document":elem;

    fun getElementById (d:doc) (id:string) = let
            val req = JSONReqStr2 "getElementById" [JSON.String id]
            val _ = PolyMLext.send(req)
            val response = PolyMLext.recv2()
            val result = case response of "null" => NONE | x => SOME (x:elem)
        in result end
        
    fun getElementsByTagName (d:doc) (tag:string) = let
            val req = JSONReqStr2 "getElementsByTagName" [JSON.String tag]
            val _ = PolyMLext.send(req)
            val response = PolyMLext.recv2();
            val _ = PolyMLext.evaluate "eval" ("val _ = (temp:="^response^");");
        in !temp end

    fun childNodes (e:elem) = let
            val req = JSONReqStr2 "childNodes" [JSON.String e]
            val _ = PolyMLext.send(req)
            val response = PolyMLext.recv2();
            val _ = PolyMLext.evaluate "eval" ("val _ = (temp:="^response^");");
        in !temp end

    fun parentNode (e:elem) = let
            val req = JSONReqStr2 "parentNode" [JSON.String e]
            val _ = PolyMLext.send(req)
            val response = PolyMLext.recv2();
            val result = case response of "null" => NONE | x => SOME (x:elem);
        in result end

    fun firstChild (e:elem) = let
            val req = JSONReqStr2 "firstChild" [JSON.String e]
            val _ = PolyMLext.send(req)
            val response = PolyMLext.recv2();
            val result = case response of "null" => NONE | x => SOME (x:elem);
        in result end

    fun lastChild (e:elem) = let
            val req = JSONReqStr2 "lastChild" [JSON.String e]
            val _ = PolyMLext.send(req)
            val response = PolyMLext.recv2();
            val result = case response of "null" => NONE | x => SOME (x:elem);
        in result end

    fun nextSibling (e:elem) = let
            val req = JSONReqStr2 "nextSibling" [JSON.String e]
            val _ = PolyMLext.send(req)
            val response = PolyMLext.recv2();
            val result = case response of "null" => NONE | x => SOME (x:elem);
        in result end

    fun previousSibling (e:elem) = let
            val req = JSONReqStr2 "previousSibling" [JSON.String e]
            val _ = PolyMLext.send(req)
            val response = PolyMLext.recv2();
            val result = case response of "null" => NONE | x => SOME (x:elem);
        in result end

    (*
    fun innerHTML (e:elem) (html:string option) = let
            val req = case html of
                NONE   => JSONReqStr2 "innerHTML" [JSON.String e]
              | SOME s => JSONReqStr2 "innerHTML" [JSON.String e, JSON.String s]
            val _ = PolyMLext.send(req)
        in PolyMLext.recv2() end
    *)
    fun setInnerHTML (e:elem) (value) = let
            val req = JSONReqStr2 "setInnerHTML" [JSON.String e, JSON.String value]
        in PolyMLext.send(req) end
    fun getInnerHTML (e:elem) = let
            val req = JSONReqStr2 "getInnerHTML" [JSON.String e]
            val _ = PolyMLext.send(req);
        in PolyMLext.recv2() end

    (*
    fun value (e:elem) (value:string option) = let
            val req = case value of
                NONE   => JSONReqStr2 "value" [JSON.String e]
              | SOME s => JSONReqStr2 "value" [JSON.String e, JSON.String s]
            val _ = PolyMLext.send(req);
        in PolyMLext.recv2() end
    *)
    fun setValue (e:elem) (value) = let
            val req = JSONReqStr2 "setValue" [JSON.String e, JSON.String value]
        in PolyMLext.send(req) end
    fun getValue (e:elem) = let
            val req = JSONReqStr2 "getValue" [JSON.String e]
            val _ = PolyMLext.send(req);
        in PolyMLext.recv2() end

    fun getAttribute (e:elem) (attr)= let
            val req = JSONReqStr2 "getAttribute" [JSON.String e, JSON.String attr]
            val _ = PolyMLext.send(req)
        in PolyMLext.recv2() end

    fun setAttribute (e:elem) (attr:string) (value:string) = let
            val req = JSONReqStr2 "setAttribute" [JSON.String e, JSON.String attr, JSON.String value]
            val _ = PolyMLext.send(req)
        in () end

    fun removeAttribute (e:elem) (attr:string) = let
            val req = JSONReqStr2 "removeAttribute" [JSON.String e, JSON.String attr]
            val _ = PolyMLext.send(req);
        in () end

    fun createElement (t:string) = let
            val req = JSONReqStr2 "createElement" [JSON.String t]
            val _ = PolyMLext.send(req);
        in PolyMLext.recv2():elem end

    fun createTextNode (text:string) = let
            val req = JSONReqStr2 "createTextNode" [JSON.String text]
            val _ = PolyMLext.send(req);
        in PolyMLext.recv2():elem end

    fun appendChild (parent:elem) (child:elem) = let
            val req = JSONReqStr2 "appendChild" [JSON.String parent, JSON.String child]
            val _ = PolyMLext.send(req);
        in () end

    fun removeChild (parent:elem) (child:elem) = let
            val req = JSONReqStr2 "removeChild" [JSON.String parent, JSON.String child]
            val _ = PolyMLext.send(req);
        in () end

    fun replaceChild (parent:elem) (child_new:elem) (child_old:elem) = let
            val req = JSONReqStr2 "replaceChild" [JSON.String parent, JSON.String child_new, JSON.String child_old]
            val _ = PolyMLext.send(req);
        in () end

    (*
    fun style (e:elem) (attr:string) (value:string option) = let
            val req = case value of
                        NONE => JSONReqStr2 "style" [JSON.String e, JSON.String attr]
                      | SOME s => JSONReqStr2 "style" [JSON.String e, JSON.String attr, JSON.String s]
            val _ = PolyMLext.send(req);
        in PolyMLext.recv2() end
    *)
    fun setStyle (e:elem) (value) = let
            val req = JSONReqStr2 "setStyle" [JSON.String e, JSON.String value]
        in PolyMLext.send(req) end
    fun getStyle (e:elem) = let
            val req = JSONReqStr2 "getStyle" [JSON.String e]
            val _ = PolyMLext.send(req);
        in PolyMLext.recv2() end
    


    (* events *)    
    fun addEventListener (e:elem) (et:eventType) (f:eventHandler) = let
            val entry = (e, et, f)
            val (id, tab) = Tab.add (Name.default_name, entry) (!eventHandlerTab)
            val _ = (eventHandlerTab := tab)
            val req = JSONReqStr2 "addEventListener" [JSON.String e,
                                                     JSON.String (string_of_eventtype et),
                                                     JSON.String (Name.string_of_name id)]
            val _ = PolyMLext.send(req)
        in id end
    
    fun removeEventListener id = let
            val (e, et, _) = Tab.get (!eventHandlerTab) id
            val tab = Tab.delete id (!eventHandlerTab)
            val _ = (eventHandlerTab := tab)
            val req = JSONReqStr2 "removeEventListener" [JSON.String e,
                                                     JSON.String (string_of_eventtype et),
                                                     JSON.String (Name.string_of_name id)]
            val _ = PolyMLext.send(req)
        in () end
        
    fun onMouseMove (e:elem) (f:eventHandler) = let
            val entry = (e, mousemove, f)
            val (id, tab) = Tab.add (Name.default_name, entry) (!eventHandlerTab)
            val _ = (eventHandlerTab := tab)
            val req = JSONReqStr2 "onMouseMove" [JSON.String e,
                                                JSON.String (string_of_eventtype mousemove),
                                                JSON.String (Name.string_of_name id)]
            val _ = PolyMLext.send(req)
        in id end
    
    (*timers*)
    fun setInterval (f:timerHandler) (time:int) = let
            val entry = (time, f)
            val (id, tab) = Tab.add (Name.default_name, entry) (!timerHandlerTab)
            val _ = (timerHandlerTab := tab)
            val req = JSONReqStr2 "setInterval" [JSON.Int time,
                                                JSON.String (Name.string_of_name id)]
            val _ = PolyMLext.send(req)
        in id end
    
    fun clearInterval id = let
            val tab = Tab.delete id (!timerHandlerTab)
            val _ = (timerHandlerTab := tab)
            val req = JSONReqStr2 "clearInterval" [JSON.String (Name.string_of_name id)]
            val _ = PolyMLext.send(req)
        in () end
    

    (*Memory management*)
    fun clearMemory (ns:string option) = let
            val req = case ns of
                        NONE => JSONReqStr2 "clearMemory" []
                      | SOME s => JSONReqStr2 "clearMemory" [JSON.String s]
            val _ = PolyMLext.send(req);
        in () end
        
    fun removeReference (e:elem) = let
            val req = JSONReqStr2 "removeReference" [JSON.String e]
            val _ = PolyMLext.send(req);
        in () end

    fun switchNamespace (ns:string option) = let
            val req = case ns of
                        NONE => JSONReqStr2 "switchNamespace" []
                      | SOME s => JSONReqStr2 "switchNamespace" [JSON.String s]
            val _ = PolyMLext.send(req);
        in () end
end;