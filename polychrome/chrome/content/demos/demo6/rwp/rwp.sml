(* Reactive Web Programming Library *)

signature ARROW0 = sig
  type ('b,'c,'k) arr
  val arr : (''b -> ''c) -> (''b,''c,'k) arr
  val >>> : (''b,''c,'k)arr * (''c,''d,'k)arr -> (''b,''d,'k)arr                                       
  val fst : (''b,''c,'k)arr -> (''b*''d,''c*''d,'k)arr
end

signature ARROW = sig
  include ARROW0
  val snd : (''b,''c,'k)arr -> (''d*''b,''d*''c,'k)arr
  val *** : (''b,''c,'k)arr * (''d,''e,'k)arr -> (''b*''d,''c*''e,'k)arr
  val &&& : (''b,''c,'k)arr * (''b,''d,'k)arr -> (''b,''c*''d,'k)arr
end

signature RWP =
sig
  eqtype B eqtype E (* kinds: Behaviors (B) and Events (E) *)
  type ('a,'k)t
  type 'a b = ('a, B)t
  type 'a e = ('a, E)t
  include ARROW where type ('a,'b,'k)arr = ('a,'k)t -> ('b,'k)t

  val timer     : int -> Time.time b
  val textField : string -> string b
  val mouseOver : string -> bool b
  val mouse     : unit -> (int*int) b
  val pair      : ''a b * ''b b -> (''a * ''b) b
  val tup3      : ''a b * ''b b * ''c b -> (''a * ''b * ''c) b
  val list      : ''a b list -> ''a list b
  val merge     : ''a e * ''a e -> ''a e
  val delay     : int -> (''a,''a,B)arr
  val calm      : int -> (''a,''a,B)arr
  val fold      : (''a * ''b -> ''b) -> ''b -> ''a e -> ''b e
  val click     : string -> ''a -> ''a e
  val changes   : ''a b -> ''a e
  val hold      : ''a -> ''a e -> ''a b
  val const     : ''a -> ''a b
  val empty     : unit -> ''a e
  val iff       : bool b * ''a b * ''a b -> ''a b
  val when      : bool b * ''a b -> ''a b
  val until     : bool b * ''a b -> ''a b
  val current   : ''a b -> ''a
  val poll      : (unit -> ''a) -> int -> ''a b
  val insertDOM : string -> string b -> unit
  val setStyle  : string -> (string * string b) -> unit
  val send      : (''a,'k)t -> ''a -> unit
  (*val flatten   : ''a b b -> ''a b*)
  val addListener : (''a,'k)t -> (''a -> unit) -> unit
end

(*
 [type 'a b] type of behavior with underlying values of type 'a.

 [type 'a e] type of event stream with underlying values of type 'a.

 [type ('b,'c,'k)arr] type of behavior (kind 'k = B) or event stream
 (kind 'k = E) transformers from type 'b to type 'c.

 [arr f] returns a transformer by lifting the function f to work on
 behaviors or events.

 [f >>> g] returns the transformer resulting from composing f and
 g. From the arrow laws, we have "arr f >>> arr g == arr (g o f)".

 [fst f] returns a pair-transformer that works as f on the first
 component and as the identity on the second component.

 [snd f] returns a pair-transformer that works as f on the second
 component and as the identity on the first component.

 [f *** g] returns a pair-transformer that works as f on the first
 component and as g on the second component.

 [f &&& g] returns a transformer that given input x will generate
 pairs (f x, g x) as outputs.

 [timer n] returns a time behavior that updates itself every n
 microseconds.

 [textField id] returns a string behavior holding the current content
 of an input field value identified by id. Raises Fail if there is no
 element identified by id in the DOM.

 [mouseover id] returns a boolean behavior with a value indicating
 whether the mouse is over the element identified by id. Raises Fail
 if there is no element identified by id in the DOM.

 [mouse()] returns a pair behavior for the x-y positions of the mouse
 relative to the upper-left corner of the browser window.

 [pair(b1,b2)] returns a behavior for the pair of the two behaviors b1
 and b2. Sem[pair(b1,b2)] = \t.(Sem[b1]t,Sem[b2]t).

 [merge(e1,e2)] returns the event stream resulting from merging the
 two event streams e1 and e2.

 [delay n b] returns a behavior equal to b but delayed n microseconds.

 [calm n b] returns a behavior equal to b but which is updated only
 when there has been no changes in b for n microseconds.

 [fold f a e] returns an event stream resulting from accumulating the
 results of calling f on events in e.

 [click id a] returns an event stream (of a's) representing clicks on
 an element identified by id. Raises Fail if there is no element
 identified by id in the DOM.

 [changes b] returns an event stream representing changes to the
 bahavior b.

 [hold a es] returns a behavior holding the value of the previous
 element in the event stream es with a being the initial value.

 [const a] returns the constant behavior with value a. Sem(const a) =
 \t.a.

 [empty()] returns the empty event stream.

 [iff (x,y,z)] returns the behavior which is y when x is true and z
 when x is false. Sem[iff (x,y,z)] = \t.if Sem[x](t) then Sem[y](t)
 else Sem[z](t).

 [when (x,y)] returns the behavior that changes according to y when x
 is true and otherwise does not change. The initial value of the
 resulting behavior is identical to the current value of y. Sem[when(x,y)] =
 \t.if Sem[x](t) then Sem[y](t) else Sem[y](t-delta).

 [until (x,y)] returns the behavior that changes according to y until
 x becomes true the first time. After this, the resulting behavior is
 constant. The initial value of the resulting behavior is identical to
 the current value of y.

 [current b] returns the current value of the behavior b.

 [poll f n] returns a behavior holding the values resulting from
 calling the function f every n microseconds.

 [insertDOM id b] effectively inserts the behavior in the DOM tree
 under the element identified by id. Raises Fail if there is no
 element identified by id in the DOM.

*)

structure RWP :> RWP =
struct

fun idError s id = 
    raise Fail (s ^ ": element with id=" ^ id ^ " not in dom")

datatype kind = Behavior | Event
type B = kind
type E = kind
type ('a,'k) t = 
     {listeners: ('a -> unit) list ref,
      newValue : 'a -> unit,
      current: 'a ref option}

type 'a b = ('a,B)t
type 'a e = ('a,E)t

fun new (init:''a option) : (''a,'k) t =
    let val listeners = ref nil
    in case init of
         SOME a =>
         let val current = ref a
         in {listeners=listeners,
             current=SOME current,
             newValue=fn v => if v = !current then ()
                              else (current := v; 
                                    app (fn f => f v) (rev(!listeners)))}
         end
       | NONE =>
         {listeners=listeners,
          current=NONE,
          newValue=fn v => app (fn f => f v) (rev(!listeners))}
    end

fun current ({current,...}:(''a,B)t) : ''a =
    case current of
      SOME(ref v) => v
    | NONE => raise Fail "current.impossible"

fun addListener ({listeners,...}: ('a,'k)t) f =
    listeners := (f :: (!listeners))

fun send (b:(''a,'k)t) (v:''a) : unit =
    #newValue b v

fun fstT (eP : (''a*''b,'k)t) : (''a,'k)t =
    let val v1opt = case #current eP of
                      SOME(ref(v1,_)) => SOME v1
                    | NONE => NONE
        val e : (''a,'k)t = new v1opt
        val _ = addListener eP (#newValue e o #1)
    in e
    end

fun sndT (eP : (''a*''b,'k)t) : (''b,'k)t =
    let val v2opt = case #current eP of
                      SOME(ref(_,v2)) => SOME v2
                    | NONE => NONE
        val e : (''b,'k)t = new v2opt
        val _ = addListener eP (#newValue e o #2)
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
          val _ = addListener e1 (fn v1: ''a => #newValue e (v1,!v2r))
          val _ = addListener e2 (fn v2: ''b => #newValue e (!v1r,v2))
      in e
      end      
    | (NONE,NONE) => (* event streams *)
      let val e1s = ref (nil : ''a list)
          val e2s = ref (nil : ''b list)
          val e : (''a*''b,'k)t = new NONE
          val _ = addListener e1 (fn v1: ''a => case get e2s of 
                                                  NONE => add e1s v1
                                                | SOME v2 => #newValue e (v1,v2))
          val _ = addListener e2 (fn v2: ''b => case get e1s of
                                                  NONE => add e2s v2
                                                | SOME v1 => #newValue e (v1,v2))
      in e
      end
    | _ => raise Fail "pairT.impossible"
end

val pair = pairT

fun tup3 (e1: ''a b, e2: ''b b, e3: ''c b) : (''a*''b*''c)b =
    case (#current e1, #current e2, #current e3) of
      (SOME v1r, SOME v2r, SOME v3r) => (* behaviors *)
      let val e : (''a*''b*''c) b = new (SOME(!v1r,!v2r,!v3r))
          val _ = addListener e1 (fn v1: ''a => #newValue e (v1,!v2r,!v3r))
          val _ = addListener e2 (fn v2: ''b => #newValue e (!v1r,v2,!v3r))
          val _ = addListener e3 (fn v3: ''c => #newValue e (!v1r,!v2r,v3))
      in e
      end 
    | _ => raise Fail "tup3.impossible"

fun merge (e1: ''a e, e2: ''a e) : ''a e =
    let val e = new NONE
        val _ = addListener e1 (#newValue e)
        val _ = addListener e2 (#newValue e)
    in e
    end

fun insertDOM (id:string) (b : string b) =
    case DOM.getElementById DOM.document id of
      SOME e => 
      (case #current b of
         SOME(ref v) => (DOM.setInnerHTML e v;
                         addListener b (DOM.setInnerHTML e))
       | NONE => raise Fail "insertDOM impossible")
    | NONE => idError "insertDOM" id

fun setStyle (id:string) (s:string, b: string b) : unit =
    case DOM.getElementById DOM.document id of
      SOME e => 
      (case #current b of
         SOME(ref v) => (DOM.setStyle e (s,v);
                         addListener b (fn v => DOM.setStyle e (s,v)))
       | NONE => raise Fail "setStyle impossible")
    | NONE => idError "setStyle" id

fun delay (ms:int) (b : ''a b) : ''a b =
    let val b' = new(case #current b of 
                       SOME(ref v) => SOME v 
                     | NONE => raise Fail "delay.impossible")
        val _ = addListener b (fn v =>
                                  (DOM.setTimeout DOM.window (DOM.TimerCallback (fn () => #newValue b' v)) ms; ()))
    in b'
    end

fun calm (ms:int) (b : ''a b) : ''a b =
    let val b' = new(case #current b of
                       SOME(ref v) => SOME v 
                     | NONE => raise Fail "calm.impossible")
        val c = ref 0
        fun incr c = c := !c + 1
        fun decr c = (c := !c - 1; !c = 0) 
        val _ = addListener b (fn v => 
                                  (incr c;
                                  (DOM.setTimeout DOM.window (DOM.TimerCallback (fn () => 
                                                        if decr c then #newValue b' v
                                                        else ()))) ms; ()))
    in b'
    end

fun textField (id:string) : string b =
    case DOM.getElementById DOM.document id of
      SOME e => let
                  val b = new (SOME(DOM.getValue e))
                  fun f (_) = (#newValue b (DOM.getValue e); ())
                  val _ = DOM.addEventListener e DOM.keyup (DOM.EventCallback f)
                in b
                end 
    | NONE => idError "textField" id

fun mouseOver (id:string) : bool b =
    case DOM.getElementById DOM.document id of
      SOME e => let
                  val b = new(SOME false)
                  fun f over (_) = (#newValue b over; ())
                  val _ = DOM.addEventListener e DOM.mouseover (DOM.EventCallback (f true))
                  val _ = DOM.addEventListener e DOM.mouseout (DOM.EventCallback (f false))
                in b
                end 
    | NONE => idError "mouseOver" id
    
fun onMouseMove (DOM.Document d) (f : int*int->unit) : unit = let
    val c = DOM.EventCallback ( fn (event) => f (DOM.getClientX event, DOM.getClientY event))
    val _ = DOM.addEventListener (DOM.HTMLElement d) DOM.mousemove c
  in () end

fun mouse() : (int*int)b =
    let val b = new(SOME(0,0))
        val () = onMouseMove DOM.document (#newValue b)
    in b
    end

fun click (id:string) (a:''a) : (''a,E)t =
    case DOM.getElementById DOM.document id of
      SOME e => let val t = new NONE
                    val _ = DOM.addEventListener e DOM.click (DOM.EventCallback (fn(_) => (#newValue t a; ())))
                in t
                end
    | NONE => idError "click" id

fun changes (b: ''a b) : ''a e =
    let val t = new NONE
        val _ = addListener b (#newValue t)
    in t
    end

fun hold (a : ''a) (e: ''a e) : ''a b =
    let val b = new(SOME a)
        val _ = addListener e (#newValue b)
    in b
    end

fun fold (f:''a*''b -> ''b) (x:''b) (a:''a e) : ''b e =
    let val t = ref x
        val es : (''b,E)t = new(NONE)
        val _ = addListener a (fn v => let val r = f(v,!t)
                                       in t := r; #newValue es r
                                       end)
    in es
    end

fun empty() : ''a e = new NONE

fun const (a:''a) : ''a b = new (SOME a)

fun poll (f: unit -> ''a) (ms:int) : ''a b = 
    let val b = new (SOME (f()))
        (* This could  be optimized so that we don't do unnecessary 
         * f-work when there is no listeners... *)
        val _ = DOM.setInterval DOM.window (DOM.TimerCallback (#newValue b o f)) ms
    in b
    end

fun timer m = poll Time.now m

type ('a,'b,'k) arr = ('a,'k)t -> ('b,'k)t

fun arr (f: ''a -> ''b) (b0:(''a,'k)t) =
    let val b = new(case #current b0 of
                      SOME(ref v) => SOME (f v)
                    | NONE => NONE)
      val _ = addListener b0 (fn v => #newValue b (f v))
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
          addListener y (fn a => if f(current x) then #newValue b (current y)
                                 else ())
      val _ = add (fn x => x) y
      val _ = add not z
      val _ = addListener x (fn t => if t then #newValue b (current y)
                                     else #newValue b (current z))
    in b
    end

fun when(x,y) =
    let val init = current y
    in hold init
       (fold (fn ((x,y),a) => if x then y else a)
             init
             (changes(pair(x,y))))
    end

fun until(x,y) =
    let val init = (current y,false,current y)
    in arr (fn (x,_,_) => x) 
       (hold init
             (fold (fn ((x,y),(a,x',y')) => 
                       if x then
                         if x' then (y,x',y')   (*yes*)
                         else (y,x,y)
                       else 
                         if x' then (a,x',y')
                         else (y,x,y))                        
                   init
                   (changes(pair(x,y))))
       )
    end

(*fun until(x,y) = when (arr not x, y) *)

fun until(x,y) =
    let val b = new (SOME(current y))
        val stop = ref (current x) 
        val _ = addListener x (fn v:bool => if v then stop := true 
                                            else ())
        val _ = addListener y (fn v => if !stop then ()
                                       else #newValue b v)
    in b
    end

end