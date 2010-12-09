
local
open RWP
infix *** &&& >>>

val timer_b = timer 100

val bt = arr (Date.toString o Date.fromTimeLocal)

val _ = insertDOM "timer" (bt timer_b)

val si_t : (string,int,B)arr = arr (Option.valOf o Int.fromString)

val form = pair(textField "a",textField "b")

val t = (si_t *** si_t) >>> (arr op +) >>> (arr Int.toString)

val _ = insertDOM "c" (t form)

val ob = mouseOver "over"

val t : (bool,string,B) arr = arr (fn true => "Mouse is over" | false => "Mouse is not over")

val _ = insertDOM "overres" (t ob)

val t : (int*int,string,B) arr = arr (fn (x,y) => "[" ^ Int.toString x ^ "," ^ Int.toString y ^ "]")

val bm = mouse()

val t10 : (int*int,int*int,B) arr = arr (fn (x,y) => (x div 10 * 10, y div 10 * 10))

val bm2 = (t10 >>> t) bm

val _ = insertDOM "mouse0" (t bm)

val _ = insertDOM "mouse1" (calm 400 bm2)

val _ = insertDOM "mouse2" (delay 400 (t bm))

datatype action = Up | Down
val esU = click "buttonUp" Up
val esD = click "buttonDown" Down
val es = merge(esU,esD)
val bc : (int,E)t = fold (fn (Up,a) => a + 1
                           | (Down,a) => a - 1) 0 es

val bc' : (int,B)t = hold 0 bc
val _ = insertDOM "clicks" (arr Int.toString bc')


in
end