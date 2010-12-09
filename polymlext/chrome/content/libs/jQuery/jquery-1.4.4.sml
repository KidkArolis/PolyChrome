signature JQUERY = sig
  (*
  type paper
  type shape
  
  
  val Raphael1 : int -> int -> int -> int -> paper
  
  val Raphael1 : { x : int, y : int, w : int, h: int } -> paper

  (fn x => Raphael1 { x = x, y = 100, w = 50, h = 50 })

  val circle : paper -> int -> int -> int -> circle
  *)

end;


structure jQuery =
struct
  local open jsffi in
    
  datatype jQueryObject = jQueryObject of fptr

  fun $ selector = jQueryObject (exec_js_r "window|" "jQuery" [arg.string selector])
  fun setCss (jQueryObject obj) attr value = exec_js obj "css" [arg.string attr, arg.string value]
  fun getCss (jQueryObject obj) attr = exec_js_r obj "css" [arg.string attr]

  end (* local *)
end