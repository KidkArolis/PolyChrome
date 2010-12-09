(* config *)
val CELL_SIZE = 3

(* select the GUI elements for later use *)
val GUI = let
  val canvas = valOf (DOM.getElementById DOM.document "paper")
  in {
    canvas = canvas,
    paper = Canvas.getContext canvas "2d",
    step_button = valOf (DOM.getElementById DOM.document "step"),
    start_button = valOf (DOM.getElementById DOM.document "start"),
    stop_button = valOf (DOM.getElementById DOM.document "stop"),
    slower_button = valOf (DOM.getElementById DOM.document "slower"),
    faster_button = valOf (DOM.getElementById DOM.document "faster")
  }
  end

(* init the life *)
val initial_life = [(24,10),(22,11),(24,11),(12,12),(13,12),(20,12),(21,12),
(34,12),(35,12),(11,13),(15,13),(20,13),(21,13),(34,13),(35,13),(0,14),(1,14),
(10,14),(16,14),(20,14),(21,14),(0,15),(1,15),(10,15),(14,15),(16,15),(17,15),
(22,15),(24,15),(10,16),(16,16),(24,16),(11,17),(15,17),(12,18),(13,18)]
val L = foldl
  (fn (x,L) =>
    Life.toggle_alive (Life.Cell.create x) L)
  (Life.create ((Canvas.canvasWidth (#paper GUI)) div CELL_SIZE))
  initial_life

(* init the state *)
val () = Life.init_state (#paper GUI, CELL_SIZE, L)

(* drawing loop *)
val drawing_thread = Thread.fork (Life.loop, [])

(* bind various GUI elements *)
val _ = DOM.addEventListener (#step_button GUI) DOM.click (DOM.EventCallback (
  fn (_) =>
    let
      val {life, paused, step, speed, paper, cell_size} = !Life.state
      val _ = Life.state := {life=life, paused=paused, step=true, speed=speed, paper=paper, cell_size=cell_size}
      val _ = ConditionVar.signal Life.conditionVar
    in () end
))
val _ = DOM.addEventListener (#stop_button GUI) DOM.click (DOM.EventCallback (
  fn (_) =>
    let
      val {life, paused, step, speed, paper, cell_size} = !Life.state
      val _ = Life.state := {life=life, paused=true, step=step, speed=speed, paper=paper, cell_size=cell_size}
    in () end
))
val _ = DOM.addEventListener (#start_button GUI) DOM.click (DOM.EventCallback (
  fn (_) =>
    let
      val {life, paused, step, speed, paper, cell_size} = !Life.state
      val _ = Life.state := {life=life, paused=false, step=step, speed=speed, paper=paper, cell_size=cell_size}
      val _ = ConditionVar.signal Life.conditionVar
    in () end
))
val _ = DOM.addEventListener (#slower_button GUI) DOM.click (DOM.EventCallback (
  fn (_) =>
    let
      val {life, paused, step, speed, paper, cell_size} = !Life.state
      val new_speed = if (speed div 2)=0 then speed else speed div 2
      val _ = Life.state := {life=life, paused=paused, step=step, speed=new_speed, paper=paper, cell_size=cell_size}
    in () end
))
val _ = DOM.addEventListener (#faster_button GUI) DOM.click (DOM.EventCallback (
  fn (_) =>
    let
      val {life, paused, step, speed, paper, cell_size} = !Life.state
      val new_speed = if (speed*2)>800 then speed else speed*2
      val _ = Life.state := {life=life, paused=paused, step=step, speed=new_speed, paper=paper, cell_size=cell_size}
    in () end
))

val _ = DOM.addEventListener (#canvas GUI) DOM.click (DOM.EventCallback (
  fn (DOM.Event e) =>
    let
      val offsetLeft = valOf (Int.fromString (JS.get (DOM.fptr_of_HTMLElement (#canvas GUI)) "offsetLeft"))
      val offsetTop = valOf (Int.fromString (JS.get (DOM.fptr_of_HTMLElement (#canvas GUI)) "offsetTop"))
      val x = valOf (Int.fromString (JS.get e "clientX")) - offsetLeft
      val y = valOf (Int.fromString (JS.get e "clientY")) - offsetTop
      val {life, paused, step, speed, paper, cell_size} = !Life.state
      val updated_life = Life.toggle_alive (Life.Cell.create (x div cell_size, y div cell_size)) life
      val _ = Life.draw (paper, cell_size) updated_life
      val _ = Life.state := {life=updated_life, paused=paused, step=step, speed=speed, paper=paper, cell_size=cell_size}
    in () end
))