signature RAPHAEL = sig
    (*
    type paper
    type shape
    
    
    val Raphael1 : int -> int -> int -> int -> paper
    
    val Raphael1 : { x : int, y : int, w : int, h: int } -> paper

    (fn x => Raphael1 { x = x, y = 100, w = 50, h = 50 })

    val circle : paper -> int -> int -> int -> circle
    *)

end;


structure Raphael =
struct
  local open jsffi in
  
  datatype paper = Paper of fptr
  datatype shape = Circle of fptr | Ellipse of fptr | Rect of fptr | Path of fptr;
  
  datatype moveCallback = MoveCallback of shape -> int -> int -> unit
  datatype startCallback = StartCallback of shape -> unit
  datatype stopCallback = StopCallback of shape -> unit
  
  (* we'll keep event callbacks here *)
  val dragCallbackTab = ref (Tab.empty : (shape * moveCallback * startCallback * stopCallback) Tab.T)
  fun handle_move id dx dy = let
      val (shape, MoveCallback f, _, _) = (Tab.get (!dragCallbackTab) (Name.mk id)) handle UNDEF => (raise Error) (* TODO, more informative error?*)
      val _ = f shape dx dy
      val _ = ready ()
    in () end
  fun handle_start id = let
      val (shape, _, StartCallback f, _) = (Tab.get (!dragCallbackTab) (Name.mk id)) handle UNDEF => (raise Error) (* TODO, more informative error?*)
      val _ = f shape
      val _ = ready ()
    in () end
  fun handle_stop id = let
      val (shape, _, _, StopCallback f) = (Tab.get (!dragCallbackTab) (Name.mk id)) handle UNDEF => (raise Error) (* TODO, more informative error?*)
      val _ = f shape
      val _ = ready ()
    in () end

  fun shapeToFptr (Circle fptr) = fptr
    | shapeToFptr (Ellipse fptr) = fptr
    | shapeToFptr (Rect fptr) = fptr
    | shapeToFptr (Path fptr) = fptr

  fun Raphael1 {x, y, w, h} = Paper (exec_js_r "window|" "Raphael" [arg.int x, arg.int y, arg.int w, arg.int h])
  fun Raphael2 id w h = Paper (exec_js_r "window|" "Raphael" [arg.string id, arg.string w, arg.string h])
  fun circle (Paper paper) x y r = Circle (exec_js_r paper "circle" [arg.int x, arg.int y, arg.int r])
  fun rect (Paper paper) x y w h r = Rect (exec_js_r paper "rect" [arg.int x, arg.int y, arg.int w, arg.int h, arg.int r])
  fun ellipse (Paper paper) x y rx ry = Ellipse (exec_js_r paper "ellipse" [arg.int x, arg.int y, arg.int rx, arg.int ry])
  fun setAttr shape attr value = exec_js (shapeToFptr shape) "attr" [arg.string attr, arg.string value]
  fun getAttr shape attr = exec_js_r (shapeToFptr shape) "attr" [arg.string attr]
  fun setAttrJSON s values = exec_js s "attr" [arg.object values]
  fun getColor () = exec_js_r "window|" "Raphael.getColor" []
  fun animate shape options time = exec_js (shapeToFptr shape) "animate" [arg.object options, arg.int time]
  fun getBBox shape = (exec_js_r (shapeToFptr shape) "getBBox" []):fptr
  fun path (Paper paper) pathString = (exec_js_r paper "path" [arg.string pathString]):fptr
  fun drag shape move start stop = let
      val move_callback = "val _ = Raphael.handle_move {id} {arg} {arg} ;"
      val move_id = Memory.addFunctionReferenceOW move_callback
      val start_callback = "val _ = Raphael.handle_start \""^(move_id^"\" ;")
      val start_id = Memory.addFunctionReference start_callback
      val stop_callback = "val _ = Raphael.handle_stop \""^(move_id^"\" ;")
      val stop_id = Memory.addFunctionReference stop_callback
      val entry = (shape, move, start, stop)
      val _ = (dragCallbackTab := Tab.ins (Name.mk move_id, entry) (!dragCallbackTab))
      val _ = exec_js (shapeToFptr shape) "drag" [arg.reference move_id, arg.reference start_id, arg.reference stop_id]
    in () end

end (* local *)
end