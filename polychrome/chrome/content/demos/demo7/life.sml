structure Life =
struct

  structure Name = SStrName
  structure Tab = Name.NTab
  structure Set = Name.NSet
  
  structure Cell =
  struct
    datatype T = T of {name: string,
                       pos:  int*int}
    fun coords_to_name (x,y) = (Int.toString x)^("."^(Int.toString y))
    fun create (x,y) = T {name=coords_to_name (x,y), pos=(x,y)}
  end
  
  datatype T = T of {alive: Cell.T list,
                     world: Cell.T list Tab.T}
  
  fun get_neighbours (T {world, ...}) (Cell.T {name,...}) = Tab.get world (Name.mk name)
  
  fun compute_neighbours (Cell.T {pos=(x,y), ...}) edge_size =
    let
      fun helper x y =
        if (x>=0) andalso
           (y>=0) andalso
           (x<edge_size) andalso
           (y<edge_size)
            then SOME (Cell.create (x,y))
            else NONE
    in 
      [ helper (x-1) (y-1),
        helper (x) (y-1),
        helper (x+1) (y-1),
        helper (x+1) (y),
        helper (x+1) (y+1),
        helper (x) (y+1),
        helper (x-1) (y+1),
        helper (x-1) (y) ]
      |> List.filter (fn NONE => false | _ => true)
      |> List.map (fn SOME x => x)
    end
  
  fun create edge_size =
    let
      fun helper ~1 ~1 tab = tab
        | helper x ~1 tab = helper (x-1) (edge_size-1) tab
        | helper x y tab =
          let
            val (cell as (Cell.T {name=name, ...})) = Cell.create (x,y)
            val entry = compute_neighbours cell edge_size
            val updated_tab = Tab.ins (Name.mk (name), entry) tab
          in helper x (y-1) updated_tab end
      val w = helper (edge_size-1) (edge_size-1) Tab.empty
    in T {alive=[], world=w} end
    
    fun is_alive (T {alive, world}) cell =
      case List.find (fn x => cell=x) alive of
          SOME x => true
        | NONE => false
    
    fun toggle_alive (cell as (Cell.T {pos=(x,y),...})) (life as (T {alive, world})) =
      case (is_alive life cell) of
          true => T {alive=(List.filter (fn x=> not (cell=x)) alive), world=world}
        | false => T {alive=cell::alive, world=world}
    
    fun draw ((Canvas.Context paper), cell_size) (life as T {alive, ...}) =
      let
        val s = alive |> map (fn (Cell.T {pos=(x,y),...}) => JSON.List [JSON.Int x, JSON.Int y])
        val _ = jsffi.exec_js "window|" "plot_life" [jsffi.arg.reference paper, jsffi.arg.list s, jsffi.arg.int cell_size]
      in life end
    fun draw2 (context, cell_size) (life as T {alive, ...}) =
      let
        val _ = Canvas.fillStyle context "#fff"
        val _ = Canvas.fillRect context 0 0 (Canvas.canvasWidth context) (Canvas.canvasHeight context)
        fun drawSingle (Cell.T {pos=(x,y),...}) = let
          val _ = Canvas.fillStyle context "#333"
          val _ = Canvas.fillRect context (x*cell_size) (y*cell_size) cell_size cell_size
        in () end
        val _ = map drawSingle alive
      in life end
    
    fun unique list =
      let
        fun helper nil ul = ul
          | helper (x::l) ul = case List.exists (fn y => case x=y of true=> true | false => false) ul of true => helper l ul | false => helper l (x::ul)
      in helper list [] end
    
    fun count_alive_neighbours life cell =
        foldl (fn (true, r) => r+1 | (false, r) => r) 0 (map (is_alive life) (get_neighbours life cell))
    
    fun update (life as T {alive, world}) =
      let
        fun lives (cell as Cell.T {name,...}) =
          if (is_alive life cell)
            then
              case count_alive_neighbours life cell of
                  2 => true
                | 3 => true
                | _ => false
            else
              case count_alive_neighbours life cell of
                  3 => true
                | _ => false
        val cells_to_reevaluate = unique (foldl (fn (cell,l) => (get_neighbours life cell) @ l) alive alive)
        val updated_alive = List.filter lives cells_to_reevaluate
      in T {alive=updated_alive, world=world} end
    
    (* state *)
    val state = ref {
      life      = create 0,
      paused    = false,
      step      = false,
      speed     = 10,
      paper     = Canvas.Context "",
      cell_size = 0
    }
    
    fun init_state (paper, cell_size, life) =
      let
        val {paused, step, speed, ...} = !state
        val _ = state := {life=life, paused=paused, step=step, speed=speed, paper=paper, cell_size=cell_size}
      in () end
    
    val mutex = Mutex.mutex()
    val conditionVar = ConditionVar.conditionVar()
    
    (* main drawing function *)
    fun loop () =
      let
        (* read the state *)
        fun next_ {life, paused, step=true, speed, paper, cell_size} =
            let
              val updated_life = draw (paper, cell_size) (update life)
              (* update the state *)
              val _ = state := {life=updated_life, paused=true, step=false, speed=speed, paper=paper, cell_size=cell_size}
              val _ = ConditionVar.wait (conditionVar, mutex)
            in () end
          | next_ {life, paused=true, step, speed, paper, cell_size} = ConditionVar.wait (conditionVar, mutex)
          | next_ {life, paused, step, speed, paper, cell_size} =
            let
              val {life, paused, step, speed, paper, cell_size} = !state
              val updated_life = draw (paper, cell_size) (update life)
              (* update the state *)
              val _ = state := {life=updated_life, paused=paused, step=step, speed=speed, paper=paper, cell_size=cell_size}
              (* wait a bit *)
              val _ = OS.Process.sleep (Time.fromMilliseconds (1000 div speed))
            in () end
          fun next () = (next_ (!state); next ())
      in
        next ()
      end
end