fun fib'(0,a,b) = a
  | fib'(n,a,b) = fib'(n-1,a+b,a)
fun fib n = fib'(n,0,1)

structure Main =
   struct
      fun doit() =
	 if 701408733 <> fib 44
	    then raise Fail "bug"
	 else ()

      val doit =
	fn () =>
	let
	  fun loop n =
	    if n = 0
	      then ()
	      else (doit();
		    loop(n-1))
	in loop 10000
	end
end;

fun test 0 = () |
    test n = let
      val _ = Main.doit();
    in test (n-1) end;

val s = Time.now();
test 1000;
val e = Time.now();

print ((Time.toString (e-s)) ^ "\n");

14.371
