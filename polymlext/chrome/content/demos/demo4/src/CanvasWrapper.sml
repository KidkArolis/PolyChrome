local open DOM in

structure Canvas =
struct
    val wn = "CanvasWrapper"
    fun getContext (Element e) (c:string) = let
            val req = JSONReqStr wn "getContext" true [JSON.String e,
                                                 JSON.String c]
            val _ = send(req)
        in Element (recv()) end;

    fun beginPath (Element e) = let
            val req = JSONReqStr wn "beginPath" false [JSON.String e]
        in send (req) end;

    fun fillStyle (Element e) (s:string) = let
            val req = JSONReqStr wn "fillStyle" false [JSON.String e,
                                                JSON.String s]
        in send (req) end;

    fun strokeStyle (Element e) (s:string) = let
            val req = JSONReqStr wn "strokeStyle" false [JSON.String e,
                                                  JSON.String s]
        in send (req) end;

    fun lineWidth (Element e) (w:real) = let
            val req = JSONReqStr wn "lineWidth" false [JSON.String e,
                                                JSON.Real w]
        in send (req) end;

    fun moveTo (Element e) (x) (y) = let
            val req = JSONReqStr wn "moveTo" false [JSON.String e,
                                             JSON.Int x,
                                             JSON.Int y]
        in send (req) end;

    fun lineTo (Element e) (x) (y) = let
            val req = JSONReqStr wn "lineTo" false [JSON.String e,
                                             JSON.Int x,
                                             JSON.Int y]
        in send (req) end;

    fun stroke (Element e) = let
            val req = JSONReqStr wn "stroke" false [JSON.String e]
        in send (req) end;

    fun arc (Element e) (x) (y) (radius) (startAng) (endAng) (clockwise) = let
            val req = JSONReqStr wn "arc" false [JSON.String e,
                                          JSON.Int x,
                                          JSON.Int y,
                                          JSON.Real radius,
                                          JSON.Real startAng,
                                          JSON.Real endAng,
                                          JSON.Bool clockwise]
        in send (req) end;

    fun fill (Element e) = let
            val req = JSONReqStr wn "fill" false [JSON.String e]
        in send(req) end;

    fun fillRect (Element e) (x) (y) (w) (h) = let
            val req = JSONReqStr wn "fillRect" false [JSON.String e,
                                               JSON.Int x,
                                               JSON.Int y,
                                               JSON.Int w,
                                               JSON.Int h]
        in send(req) end;

    fun canvasWidth (Element e) = let
            val req = JSONReqStr wn "canvasWidth" true [JSON.String e]
            val _ = send(req)
        in (valOf (Int.fromString (recv()))) end;

    fun canvasHeight (Element e) = let
            val req = JSONReqStr wn "canvasHeight" true [JSON.String e]
            val _ = send(req)
        in (valOf (Int.fromString (recv()))) end;
end

end