local open DOM in

structure Raphael =
struct
    val w = "Raphael"

    fun Raphael (x, y, w, h) = let
            val req = JSONReqStr w "Raphael" true [JSON.Int x, JSON.Int, y, JSON.Int w, JSON.Int h]
            val _ = send(req)
        in recv() end
        
    fun circle paper x y r = let
            val req = JSONReqStr w "circle" true [JSON.Int x, JSON.Int, y, JSON.Int r]
            val _ = send(req)
        in recv() end
        
    fun setCircleAttr circle attr value = let
            
end

end