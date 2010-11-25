open Raphael

(* helpers *)
fun s2i x = valOf (Int.fromString x)

(* our canvas *)
val r = Raphael2 "holder" "100%" "100%"

(* CONNECTIONS *)
datatype connection = Connection of jsffi.fptr * shape * shape

fun computeConnectionPath shape1 shape2 = let
    val bb1 = getBBox shape1
    val bb2 = getBBox shape2        
    val s1x = (s2i (JS.get bb1 "x"))
    val s1y = (s2i (JS.get bb1 "y"))
    val s1w = (s2i (JS.get bb1 "width"))
    val s1h = (s2i (JS.get bb1 "height"))
    val s2x = (s2i (JS.get bb2 "x"))
    val s2y = (s2i (JS.get bb2 "y"))
    val s2w = (s2i (JS.get bb2 "width"))
    val s2h = (s2i (JS.get bb2 "height"))
    val p1 = [
      (s1x + (s1w div 2), s1y - 1),
      (s1x + (s1w div 2), s1y + s1h + 1),
      (s1x - 1, s1y + (s1h div 2)),
      (s1x + s1w + 1, s1y + (s1h div 2))
    ]
    val p2 = [
      (s2x + (s2w div 2), s2y - 1),
      (s2x + (s2w div 2), s2y + s2h + 1),
      (s2x - 1, s2y + (s2h div 2)),
      (s2x + s2w + 1, s2y + (s2h div 2))
    ]
    
    val res1 = 3
    val res2 = 2
    val (x1, y1) = nth p1 res1
    val (x4, y4) = nth p2 res2
    val dx = Int.max (Int.abs (x1-x4), 10)
    val dy = Int.max (Int.abs (y1-y4), 10)
    val x2 = nth [x1, x1, x1-dx, x1+dx] res1
    val y2 = nth [y1-dy, y1+dy, y1, y1] res1
    val x3 = nth [x4, x4, x4-dx, x4+dx] res2
    val y3 = nth [y1+dy, y1-dy, y4, y4] res2
    val path = String.concatWith "," ["M", Int.toString x1, Int.toString y1, "C", Int.toString x2, Int.toString y2, Int.toString x3, Int.toString y3, Int.toString x4, Int.toString y4]
  in path end
    
fun createConnection shape1 shape2 = let
    val p = computeConnectionPath shape1 shape2
    val line = path r p
    val _ = setAttrJSON line (JSON.empty |> JSON.add ("stroke", JSON.String "#fff") |> JSON.add ("fill", JSON.String "none"))
  in Connection (line, shape1, shape2) end
    
fun redrawConnection (Connection (line, shape1, shape2)) = setAttr (Path line) "path" (computeConnectionPath shape1 shape2)


val shapes = [
  (ellipse r 190 100 30 20),
  (rect r 290 80 60 40 10),
  (rect r 290 180 60 40 2),
  (ellipse r 450 100 20 20)
]

val connections = [
  (createConnection (nth shapes 0) (nth shapes 1)),
  (createConnection (nth shapes 1) (nth shapes 2)),
  (createConnection (nth shapes 1) (nth shapes 3)),
  (createConnection (nth shapes 0) (nth shapes 3))
]

fun move shape dx dy = let
    val _ = Profiling.profile ";drawing loop;;"
    val shape_type = JS.get (shapeToFptr shape) "type"
    val (x_label, y_label) = case shape_type of "rect" => ("x", "y") | x => ("cx", "cy")
    val ox = JS.get (shapeToFptr shape) "ox"
    val oy = JS.get (shapeToFptr shape) "oy"
    val x = Int.toString (dx + (valOf (Int.fromString ox)))
    val y = Int.toString (dy + (valOf (Int.fromString oy)))
    val _ = setAttr shape x_label x
    val _ = setAttr shape y_label y
    val _ = map redrawConnection connections
    val _ = Profiling.profile "Z;drawing done;;"
  in () end
fun start shape = let
    val shape_type = JS.get (shapeToFptr shape) "type"
    val (x_label, y_label) = case shape_type of "rect" => ("x", "y") | x => ("cx", "cy")
    val _ = JS.set (shapeToFptr shape) "ox" (jsffi.arg.string (getAttr shape x_label))
    val _ = JS.set (shapeToFptr shape) "oy" (jsffi.arg.string (getAttr shape y_label))
    (*val _ = animate shape (JSON.empty |> JSON.add ("fill-opacity", JSON.Real 0.4)) 500*)
  in () end
fun stop shape = let
    (*val _ = animate shape (JSON.empty |> JSON.add ("fill-opacity", JSON.Real 0.0)) 500*)
  in () end

val _ = map (fn(x) => let
  val color = getColor ();
  val values = JSON.empty
    |> JSON.add ("fill", JSON.String color)
    |> JSON.add ("stroke", JSON.String color)
    |> JSON.add ("fill-opacity", JSON.Int 0)
    |> JSON.add ("stroke-width", JSON.Int 2)
    |> JSON.add ("cursor", JSON.String "move")
  val _ = setAttrJSON (shapeToFptr x) (values)
  val _ = drag x (MoveCallback move) (StartCallback start) (StopCallback stop) in
  x end) shapes