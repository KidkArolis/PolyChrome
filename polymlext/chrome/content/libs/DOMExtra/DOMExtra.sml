    (* DOMExtraLib *)
    fun parseMouseMoveEvent (event) = (String.tokens (fn (#",") => true | _ => false) event)
            |> map Int.fromString
            |> map valOf
    fun getMouseCoords () = let
            val req = JSONReqStr2 "getMouseCoords" true []
            val _ = send(req)
            val response = recv()
            val [x,y] = parseMouseMoveEvent response
        in (x, y) end    
    fun cancelMouseCoordsPolling () = let
            val req = JSONReqStr2 "cancelMouseCoordsPolling" false []
        in send(req) end