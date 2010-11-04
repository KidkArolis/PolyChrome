local open DOM in

structure jQueryWrapper =
struct
    val w = "jQueryWrapper"
    fun $ (selector) = let
            val req = JSONReqStr w "select" true [JSON.String selector]
            val _ = send(req)
        in parse_element_list (recv()) end
end

end