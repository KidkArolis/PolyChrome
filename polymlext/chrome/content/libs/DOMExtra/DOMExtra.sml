(* DOMExtra library *)
signature DOMEXTRA =
sig
    val getMouseCoords : unit -> int * int
    val cancelMouseCoordsPolling : unit -> unit
end

structure DOMExtra : DOMEXTRA =
struct

    local open jsffi in
    local open DOM in

    fun parseMouseCoords (event) = let
            val [x,y] = (String.tokens (fn (#",") => true | _ => false) event)
                        |> map Int.fromString
                        |> map valOf
        in (x,y) end
    
    fun getMouseCoords () = parseMouseCoords (exec_js_r "window|" "DOMExtra.getMouseCoords" [])   
    fun cancelMouseCoordsPolling () = exec_js "window|" "DOMExtra.cancelMouseCoordsPolling" []
    
    end
    end
end