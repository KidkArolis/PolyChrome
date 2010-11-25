(* DOMExtra library *)
signature DOMEXTRA =
sig
    val getMouseCoords : unit -> int * int
    val cancelMouseCoordsPolling : unit -> unit
    val getHTMLCollectionItem : DOM.HTMLCollection -> int -> DOM.HTMLElement
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
    
    fun getMouseCoords () = parseMouseCoords (exec_js_r "window" "DOMExtra.getMouseCoords" [])   
    fun cancelMouseCoordsPolling () = exec_js "window" "DOMExtra.cancelMouseCoordsPolling" []
    
    fun getHTMLCollectionItem (HTMLCollection x) n = HTMLElement (exec_js_get x (Int.toString n) [])
    
    end
    end
end