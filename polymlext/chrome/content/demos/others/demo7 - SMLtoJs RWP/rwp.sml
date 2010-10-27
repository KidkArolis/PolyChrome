signature HEAP = sig
  type 'a t
  val empty : ('a -> int) -> 'a t
  val put   : 'a t -> 'a -> 'a t
  val get   : 'a t -> ('a * 'a t) option
end

structure Heap : HEAP = struct
type 'a t = {values: 'a list,   (* sorted *)
             indexFn: 'a -> int}
fun empty f = {values=nil,indexFn=f}

exception SAME
fun insert ind (nil,v) = [v]
  | insert ind (all as x::xs,v) = 
    if ind v < ind x then v::all
    else if ind x < ind v then x :: insert ind (xs,v)
    else raise SAME

fun put (t as {values,indexFn}) v =
    {values=insert indexFn (values,v),
     indexFn=indexFn}
    handle SAME => t
    
fun get ({values=nil,...}:'a t) = NONE
  | get {values=x::xs,indexFn} = SOME(x,{values=xs,indexFn=indexFn})
end

            
structure RWP (*:> RWP*) =
struct

local (* node ids *)
  val c = ref 0
in 
  fun newNodeId () =
      !c before (c:= !c + 1)
end

fun idError s id = 
    raise Fail (s ^ ": element with id=" ^ id ^ " not in dom")

datatype kind = Behavior | Event
type B = kind
type E = kind

type pack = {nid:int, comp:unit->unit}

(* Listener ids *)
structure LId :> sig eqtype t
                   val new : unit -> t
                   val dummy : t
                 end =
struct
  type t = int
  val c = ref 1  (* 0 is reserved *)
  fun new() = !c before (c:= !c + 1)
  val dummy = 0
end

type ('a,'k) t = 
     {nid: int,
      fns: (LId.t * ('a->unit)) list ref,
      current: 'a ref option}

(* Evaluation of graph *)

structure H : sig
  val put : pack -> unit
  val get : unit -> pack option
end = struct

  (* global node heap *)
  val h : pack Heap.t ref =
      ref (Heap.empty #nid)
  fun put (p:pack) : unit =
      h := Heap.put(!h) p
  fun get() =
      case Heap.get(!h) of
        SOME(v,j) => SOME v before h:=j
      | NONE => NONE
end

fun pack (t:('a,'k)t) : pack =
    {nid= #nid t,
     comp= fn() =>
           case #current t of
             SOME (ref v) => 
             List.app (fn (_,f) => f v) (rev(!(#fns t)))
           | NONE => raise Fail "pack.comp.NONE"}

fun eval() =
    case H.get() of
      NONE => ()
    | SOME p => (#comp p (); eval ())

type 'a b = ('a,B)t
type 'a e = ('a,E)t

fun new (init:''a option) : (''a,'k) t =
    {nid=newNodeId(),
     fns=ref nil,
     current=Option.map ref init}

fun newValue (b:(''a,'k)t) : ''a -> unit =
    case #current b of
      SOME r => (fn v => if v = !r then ()
                         else (r := v; H.put (pack b)))
    | NONE => fn v => app (fn (_,f) => f v) (rev(!(#fns b)))

fun current (b:''a b) : ''a =
    case #current b of
      SOME(ref v) => v
    | NONE => raise Fail "rwp.current.impossible"

fun addListener ({fns,...}: ('a,'k)t) f : unit =
    fns := ((LId.dummy,f) :: (!fns))

fun addListener' ({fns,...}: ('a,'k)t) f : LId.t =
    let val lid = LId.new()
    in fns := ((lid,f) :: (!fns))
     ; lid
    end
    
fun remListener ({fns,...}: ('a,'k)t) (lid : LId.t) : bool =
    let fun remove nil = (nil,false)
          | remove ((x as (l,_))::xs) = 
            if l = lid then (xs,true)
            else let val (xs,p) = remove xs
                 in (x::xs,p)
                 end
        val (fns',p) = remove (!fns)
        val _ = if p then fns := fns'
                else ()
    in p
    end

fun send (b:(''a,'k)t) (v:''a) : unit =
    newValue b v

fun fstT (eP : (''a*''b,'k)t) : (''a,'k)t =
    let val v1opt = case #current eP of
                      SOME(ref(v1,_)) => SOME v1
                    | NONE => NONE
        val e : (''a,'k)t = new v1opt
        val () = addListener eP (newValue e o #1)
    in e
    end

fun sndT (eP : (''a*''b,'k)t) : (''b,'k)t =
    let val v2opt = case #current eP of
                      SOME(ref(_,v2)) => SOME v2
                    | NONE => NONE
        val e : (''b,'k)t = new v2opt
        val () = addListener eP (newValue e o #2)
    in e
    end

local 
  fun get(r as ref(x::xs)) = SOME x before r:=xs
    | get(ref nil) = NONE
  fun add(r) x = r := rev(x::(rev(!r)))
in
fun pairT (e1: (''a,'k)t, e2: (''b,'k)t) : (''a*''b,'k)t =
    case (#current e1, #current e2) of
      (SOME v1r, SOME v2r) => (* behaviors *)
      let val e : (''a*''b,'k) t = new (SOME(!v1r,!v2r))
          val () = addListener e1 (fn v1: ''a => newValue e (v1,!v2r))
          val () = addListener e2 (fn v2: ''b => newValue e (!v1r,v2))
      in e
      end      
    | (NONE,NONE) => (* event streams *)
      let val e1s = ref (nil : ''a list)
          val e2s = ref (nil : ''b list)
          val e : (''a*''b,'k)t = new NONE
          val _ = addListener e1 (fn v1: ''a => case get e2s of 
                                                  NONE => add e1s v1
                                                | SOME v2 => newValue e (v1,v2))
          val _ = addListener e2 (fn v2: ''b => case get e1s of
                                                  NONE => add e2s v2
                                                | SOME v1 => newValue e (v1,v2))
      in e
      end
    | _ => raise Fail "pairT.impossible"
end

val pair = pairT

fun tup3 (e1: ''a b, e2: ''b b, e3: ''c b) : (''a*''b*''c)b =
    case (#current e1, #current e2, #current e3) of
      (SOME v1r, SOME v2r, SOME v3r) => (* behaviors *)
      let val e : (''a*''b*''c) b = new (SOME(!v1r,!v2r,!v3r))
          val _ = addListener e1 (fn v1: ''a => newValue e (v1,!v2r,!v3r))
          val _ = addListener e2 (fn v2: ''b => newValue e (!v1r,v2,!v3r))
          val _ = addListener e3 (fn v3: ''c => newValue e (!v1r,!v2r,v3))
      in e
      end 
    | _ => raise Fail "tup3.impossible"

fun merge (e1: ''a e, e2: ''a e) : ''a e =
    let val e = new NONE
        val () = addListener e1 (newValue e)
        val () = addListener e2 (newValue e)
    in e
    end

fun insertDOM (id:string) (b : string b) =
    case Js2.getElementById Js2.document id of
      SOME e => 
      (case #current b of
         SOME(ref v) => (Js2.innerHTML e v;
                         addListener b (Js2.innerHTML e))
       | NONE => raise Fail "insertDOM impossible")
    | NONE => idError "insertDOM" id

fun setStyle (id:string) (s:string, b: string b) : unit =
    case Js2.getElementById Js2.document id of
      SOME e => 
      (case #current b of
         SOME(ref v) => (Js2.style e (s,v);
                         addListener b (fn v => Js2.style e (s,v)))
       | NONE => raise Fail "setStyle impossible")
    | NONE => idError "setStyle" id
(**
fun delay (ms:int) (b : ''a b) : ''a b =
    let val b' = new(case #current b of 
                       SOME(ref v) => SOME v 
                     | NONE => raise Fail "delay.impossible")
        val () = addListener b (fn v =>
                                   (Js2.setTimeout ms (fn () => 
                                                         ((* eval queue should be empty here! *)
                                                          newValue b' v; 
                                                          eval()
                                                         )
                                                     ); ()
                                   )
                               )
    in b'
    end

fun calm (ms:int) (b : ''a b) : ''a b =
    let val b' = new(case #current b of
                       SOME(ref v) => SOME v 
                     | NONE => raise Fail "calm.impossible")
        val c = ref 0
        fun incr c = c := !c + 1
        fun decr c = (c := !c - 1; !c = 0) 
        val () = addListener b (fn v => 
                                  (incr c;
                                   Js2.setTimeout ms (fn () => 
                                                        if decr c then 
                                                          ((* eval queue should be empty here! *)
                                                           newValue b' v;
                                                           eval()
                                                          )
                                                        else ()); 
                                   ()))
    in b'
    end
**)

fun textField (id:string) : string b =
    case Js2.getElementById Js2.document id of
      SOME e => let
                  val b = new (SOME(Js2.value e))
                  fun f () = (newValue b (Js2.value e); eval(); true);
                  val () = Js2.addEventListener e "keyup" "(newValue (new (SOME(Js2.value e))) (Js2.value e); eval(); true)"                                
                in b
                end 
    | NONE => idError "textField" id
(**
fun mouseOver (id:string) : bool b =
    case Js2.getElementById Js2.document id of
      SOME e => let
                  val b = new(SOME false)
                  fun f over () = (newValue b over; eval(); true)
                  val () = Js2.installEventHandler e Js2.onmouseover (f true)
                  val () = Js2.installEventHandler e Js2.onmouseout (f false)
                in b
                end 
    | NONE => idError "mouseOver" id

fun mouse() : (int*int)b =
    let val b = new(SOME(0,0))
        val () = Js2.onMouseMove Js2.document (fn v => (newValue b v; eval()))
    in b
    end

fun click (id:string) (a:''a) : (''a,E)t =
    case Js2.getElementById Js2.document id of
      SOME e => let val t = new NONE
                    val () = Js2.installEventHandler e Js2.onclick (fn() => (newValue t a; eval(); true))
                in t
                end
    | NONE => idError "click" id
**)
fun changes (b: ''a b) : ''a e =
    let val t = new NONE
        val () = addListener b (newValue t)
    in t
    end

fun hold (a : ''a) (e: ''a e) : ''a b =
    let val b = new(SOME a)
        val () = addListener e (newValue b)
    in b
    end

fun fold (f:''a*''b -> ''b) (x:''b) (a:''a e) : ''b e =
    let val t = ref x
        val es : (''b,E)t = new(NONE)
        val () = addListener a (fn v => let val r = f(v,!t)
                                       in t := r; newValue es r
                                       end)
    in es
    end

fun empty() : ''a e = new NONE

fun const (a:''a) : ''a b = new (SOME a)

fun poll (f: unit -> ''a) (ms:int) : ''a b = 
    let val b = new (SOME (f()))
        (* This could  be optimized so that we don't do unnecessary 
         * f-work when there is no listeners... *)
        val _ = Js2.setInterval "(fn v => (newValue b (f v); eval()))" ms
    in b
    end

fun timer m = poll Time.now m

fun die s = raise Fail ("Die:" ^ s)

fun ''a addListener'' (b:''a b) (f : ''a -> unit) : unit -> bool =
    let val li : LId.t = addListener' b f
    in fn () => remListener b li
    end

fun flatten (a: ''a b b) : ''a b =
    let 
      val aa : ''a b = (current : ''a b b -> ''a b) a
      val n : ''a b = new(SOME(current(current a)))
                          
      (* There are two possibilities for change: (1) in the toplevel
       * behavior and (2) in the underlying behavior. Whenever there is a
       * change in the toplevel behavior, we adjust the listener for the
       * underlying behavior. *) 

      val remLi : (unit -> bool) ref = 
          ref (addListener'' (current a) (newValue n))

      val () = addListener a (fn b : ''a b => ((!remLi)();
                                               remLi := addListener'' b (newValue n);
                                               newValue n (current b)))
    in n 
    end

type ('a,'b,'k) arr = ('a,'k)t -> ('b,'k)t

fun arr (f: ''a -> ''b) (b0:(''a,'k)t) =
    let val b = new(case #current b0 of
                      SOME(ref v) => SOME (f v)
                    | NONE => NONE)
      val () = addListener b0 (newValue b o f)
    in b
    end

fun list (nil: ''a b list) : ''a list b = const nil
  | list (x::xs) = arr (op ::) (pair(x,list xs))

fun fst f = fn p => pairT(f(fstT p),sndT p)

infix >>> *** &&&

fun a1 >>> a2 = a2 o a1

fun snd f = 
    let fun swap (a,b) = (b,a)
    in arr swap >>> fst f >>> arr swap
    end

fun f *** g = fst f >>> snd g

fun f &&& g = arr (fn b => (b,b)) >>> (f *** g) 

(*
fun iff(x,y,z) =
    let val t = pair(x,pair(y,z))
        val (x0,(y0,z0)) = current t
        val init = if x0 then y0 else z0
    in hold init 
       (fold (fn ((x,(y,z)),a) => if x then y else z) init t)
    end
*)

fun iff(x,y,z) =
    let val init = if current x then current y else current z
      val b = new (SOME init)
      fun add f y =
          addListener y (fn a => if f(current x) then newValue b (current y)
                                 else ())
      val _ = add (fn x => x) y
      val _ = add not z
      val _ = addListener x (fn t => if t then newValue b (current y)
                                     else newValue b (current z))
    in b
    end

fun when(x,y) =
    let val init = current y
    in hold init
       (fold (fn ((x,y),a) => if x then y else a)
             init
             (changes(pair(x,y))))
    end
(*
fun until(x,y) =
    let val init = {acc=current y,stop=current x}
    in arr (fn {acc,...} => acc) 
       (hold init
             (fold (fn ((x,y), a as {acc,stop=true}) => a
                     | ((x,y), a as {acc,stop=false}) =>  
                       if x then {acc=y,stop=true}
                       else {acc=y,stop=false})
                   init
                   (changes(pair(x,y))))
       )
    end

fun until(x,y) =
    let val b = new (SOME(current y))
        val stop = ref (current x) 
        val _ = addListener x (fn v:bool => if v then stop := true 
                                            else ())
        val _ = addListener y (fn v => if !stop then ()
                                       else newValue b v)
    in b
    end
*)

fun until(x,y) =
    let val init = {acc=current y,stop=current x}
    in arr (fn {acc,...} => acc) 
       (hold init
             (fold (fn ((x,y), a as {acc,stop=true}) => a
                     | ((x,y), a as {acc,stop=false}) =>  
                       if x then {acc=y,stop=true}
                       else {acc=y,stop=false})
                   init
                   (changes(pair(x,y))))
       )
    end
    
val print = Js2.print;

end
