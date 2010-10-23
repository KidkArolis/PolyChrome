(*signature JS =*)
(*sig*)
(*end*)

structure Name = SStrName;
structure Tab = Name.NTab;

structure DOMInternal =
struct
    (* should we hide certain functionality from the user *)
end;

structure DOM =
struct

    exception Error

    (*helpers*)    
    val DOMWrapperJSON = JSON.empty
                      |> JSON.add ("type", JSON.Int 2)
    val CustomWrapperJSON = JSON.empty
                         |> JSON.add ("type", JSON.Int 3)
    
    fun bool_to_int (true) = 1 | bool_to_int (false) = 0
    
    (*this one is used internally for all default DOM functions *)
    fun JSONReq2 f r args =
        let
            val x = JSON.add ("f", JSON.String f) DOMWrapperJSON
                 |> JSON.add ("r", JSON.Int (bool_to_int r))
        in
            foldl (fn (v, tab) => JSON.add ("arg1", v) tab) x args
        end
    fun JSONReqStr2 f r args = JSON.encode (JSONReq2 f r args)
    
    (*this one is used for custom wrappers *)
    fun JSONReq wrapper_name f r args =
        let
            val x = JSON.add ("f", JSON.String f) CustomWrapperJSON
                 |> JSON.add ("w", JSON.String wrapper_name)
                 |> JSON.add ("r", JSON.Int (bool_to_int r))
        in
            foldl (fn (v, tab) => JSON.add ("arg1", v) tab) x args
        end
    fun JSONReqStr wrapper_name f r args = JSON.encode (JSONReq wrapper_name f r args)
    

    (*DOM*)
    datatype element = Element of string 
    datatype eventListener = EventListener of Name.name;
    
    
    fun parse_element_list l =
            String.tokens (fn (#",") => true | _ => false) l
            |> map (fn (x) => Element x)

    
    (*
    fun parse_element (str) = let
            fun e ([idx, ns]) = Element (idx,ns)
              | e [idx] = Element (idx, "")
              | e _ = raise Error
            val l = String.tokens (fn (#",") => true | _ => false) str
        in e(l) end
    *)
    
    datatype eventType = click | change | keypress | keyup | mouseover | mouseout | mousemove

    fun string_of_eventtype click = "click"
      | string_of_eventtype change = "change"
      | string_of_eventtype keypress = "keypress"
      | string_of_eventtype keyup = "keyup"
      | string_of_eventtype mouseover = "mouseover"
      | string_of_eventtype mouseout = "mouseout"
      | string_of_eventtype mousemove = "mousemove"
    
    datatype eventHandler = EventHandler of string -> unit
    datatype timerHandler = TimerHandler of unit -> unit
    
    (* memory *)
    (* we'll keep event handlers here *)
    val eventHandlerTab = ref (Tab.empty : (element * eventType * eventHandler) Tab.T)
    fun handle_event (id:string) (eventData:string) = let
            val (_, _, EventHandler f) = Tab.get (!eventHandlerTab) (Name.mk id)
        in f(eventData) end
    
    (* we'll keep timer callbacks here *)
    val timerHandlerTab = ref (Tab.empty : (int * timerHandler) Tab.T)
    fun handle_timer (id:string) = let
            val (_, TimerHandler f) = Tab.get (!timerHandlerTab) (Name.mk id)
        in f() end
        
    
    fun send (m) = PolyMLext.send m
    fun recv () = PolyMLext.recv2 ()

    (* element manipulation *)
    fun getElementById (id:string) = let
            val req = JSONReqStr2 "getElementById" true [JSON.String id]
            val _ = send(req)
            val response = recv()
            val result = case response of "null" => NONE | x => SOME (Element x)
        in result end
        
    fun getElementsByTagName (tag:string) = let
            val req = JSONReqStr2 "getElementsByTagName" true [JSON.String tag]
            val _ = send(req)
        in parse_element_list (recv()) end

    fun childNodes (Element e) = let
            val req = JSONReqStr2 "childNodes" true [JSON.String e]
            val _ = send(req)
        in parse_element_list (recv()) end

    fun parentNode (Element e) = let
            val req = JSONReqStr2 "parentNode" true [JSON.String e]
            val _ = send(req)
            val response = recv()
            val result = case response of "null" => NONE | x => SOME (Element x)
        in result end

    fun firstChild (Element e) = let
            val req = JSONReqStr2 "firstChild" true [JSON.String e]
            val _ = send(req)
            val response = recv()
            val result = case response of "null" => NONE | x => SOME (Element x)
        in result end

    fun lastChild (Element e) = let
            val req = JSONReqStr2 "lastChild" true [JSON.String e]
            val _ = send(req)
            val response = recv()
            val result = case response of "null" => NONE | x => SOME (Element x)
        in result end

    fun nextSibling (Element e) = let
            val req = JSONReqStr2 "nextSibling" true [JSON.String e]
            val _ = send(req)
            val response = recv()
            val result = case response of "null" => NONE | x => SOME (Element x)
        in result end

    fun previousSibling (Element e) = let
            val req = JSONReqStr2 "previousSibling" true [JSON.String e]
            val _ = send(req)
            val response = recv()
            val result = case response of "null" => NONE | x => SOME (Element x)
        in result end

    fun setInnerHTML (Element e) (value) = let
            val req = JSONReqStr2 "setInnerHTML" false [JSON.String e, JSON.String value]
        in send(req) end
        
    fun getInnerHTML (Element e) = let
            val req = JSONReqStr2 "getInnerHTML" true [JSON.String e]
            val _ = send(req)
        in recv() end

    fun setValue (Element e) (value) = let
            val req = JSONReqStr2 "setValue" false [JSON.String e, JSON.String value]
        in send(req) end
        
    fun getValue (Element e) = let
            val req = JSONReqStr2 "getValue" true [JSON.String e]
            val _ = send(req)
        in recv() end

    fun getAttribute (Element e) (attr)= let
            val req = JSONReqStr2 "getAttribute" true [JSON.String e, JSON.String attr]
            val _ = send(req)
        in recv() end

    fun setAttribute (Element e) (attr:string) (value:string) = let
            val req = JSONReqStr2 "setAttribute" false [JSON.String e, JSON.String attr, JSON.String value]
            val _ = send(req)
        in () end

    fun removeAttribute (Element e) (attr:string) = let
            val req = JSONReqStr2 "removeAttribute" false [JSON.String e, JSON.String attr]
            val _ = send(req)
        in () end

    fun createElement (t:string) = let
            val req = JSONReqStr2 "createElement" true [JSON.String t]
            val _ = send(req)
        in Element (recv()) end

    fun createTextNode (text:string) = let
            val req = JSONReqStr2 "createTextNode" true [JSON.String text]
            val _ = send(req)
        in Element (recv()) end

    fun appendChild (Element parent) (Element child) = let
            val req = JSONReqStr2 "appendChild" false [JSON.String parent, JSON.String child]
            val _ = send(req)
        in () end

    fun removeChild (Element parent) (Element child) = let
            val req = JSONReqStr2 "removeChild" false [JSON.String parent, JSON.String child]
            val _ = send(req)
        in () end

    fun replaceChild (Element parent) (Element child_new) (Element child_old) = let
            val req = JSONReqStr2 "replaceChild" false [JSON.String parent, JSON.String child_new, JSON.String child_old]
            val _ = send(req)
        in () end

    fun setStyle (Element e) (attr) (value) = let
            val req = JSONReqStr2 "setStyle" false [JSON.String e, JSON.String attr, JSON.String value]
        in send(req) end
    
    fun getStyle (Element e) (attr) = let
            val req = JSONReqStr2 "getStyle" true [JSON.String e, JSON.String attr]
            val _ = send(req)
        in recv() end
    


    (* events *)    
    fun addEventListener (elem as (Element e)) (et:eventType) (f:eventHandler) = let
            val entry = (elem, et, f)
            val (id, tab) = Tab.add (Name.default_name, entry) (!eventHandlerTab)
            val _ = (eventHandlerTab := tab)
            val req = JSONReqStr2 "addEventListener" false [JSON.String e,
                                                            JSON.String (string_of_eventtype et),
                                                            JSON.String (Name.string_of_name id)]
            val _ = send(req)
        in EventListener id end
    
    fun removeEventListener (EventListener id) = let
            val (Element e, et, _) = (Tab.get (!eventHandlerTab) id) handle UNDEF => (raise PolyMLext.DOMExn "Undefined listener");
            val tab = Tab.delete id (!eventHandlerTab)
            val _ = (eventHandlerTab := tab)
            val req = JSONReqStr2 "removeEventListener" false [JSON.String e,
                                                               JSON.String (string_of_eventtype et),
                                                               JSON.String (Name.string_of_name id)]
            val _ = send(req)
        in () end
        
    fun onMouseMove (elem as (Element e)) (f:eventHandler) = let
            val entry = (elem, mousemove, f)
            val (id, tab) = Tab.add (Name.default_name, entry) (!eventHandlerTab)
            val _ = (eventHandlerTab := tab)
            val req = JSONReqStr2 "onMouseMove" false [JSON.String e,
                                                       JSON.String (string_of_eventtype mousemove),
                                                       JSON.String (Name.string_of_name id)]
            val _ = send(req)
        in EventListener id end
        
    fun getMouseCoords () = let
            val req = JSONReqStr2 "getMouseCoords" true []
            val _ = send(req)
            val response = recv()
            val [x,y] = (String.tokens (fn (#",") => true | _ => false) response)
        in (valOf (Int.fromString x), valOf (Int.fromString y)) end
    
    (*timers*)
    fun setInterval (f:timerHandler) (time:int) = let
            val entry = (time, f)
            val (id, tab) = Tab.add (Name.default_name, entry) (!timerHandlerTab)
            val _ = (timerHandlerTab := tab)
            val req = JSONReqStr2 "setInterval" false [JSON.Int time,
                                                       JSON.String (Name.string_of_name id)]
            val _ = send(req)
        in id end
    
    fun clearInterval id = let
            val tab = Tab.delete id (!timerHandlerTab)
            val _ = (timerHandlerTab := tab)
            val req = JSONReqStr2 "clearInterval" false [JSON.String (Name.string_of_name id)]
            val _ = send(req)
        in () end
    

    (*Memory management*)
    fun removeReference (Element e) = let
            val req = JSONReqStr2 "removeReference" false [JSON.String e]
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
        
end;