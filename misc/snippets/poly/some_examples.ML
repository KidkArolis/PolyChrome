(* Random numbers in ML *)
exception RANDOM;

fun rmod x y = x - y * Real.realFloor (x / y);

local
  val a = 16807.0;
  val m = 2147483647.0;
  val random_seed = ref 1.0;
in

fun random () = 
  let val r = rmod (a * ! random_seed) m
  in (random_seed := r; r) end;

fun set_random_seed x = (random_seed := x);

end;

fun random_range l h =
  if h < l orelse l < 0 then raise RANDOM
  else l + Real.floor (rmod (random ()) (real (h - l + 1)));

set_random_seed(Time.toReal (Time.now()));

TextIO.print ("A random number: " ^ (Real.toString(random())) ^ "\n");
TextIO.print ("A random number: " ^ (Real.toString(random())) ^ "\n");

(* Fold for natural numbers:  f (f (f ... f a))
   apply the function f, n times, to a *)
fun fold_nat f i a = 
    if i <= 0 then a else fold_nat f (i - 1) (f i a);

(* example use: construct a string for the 10 numbers from 10 *) 
val (n, s) =
  fold_nat 
    (fn x => fn (a_n, a_s) => 
      (a_n + 1, a_s ^ "x: " ^ (Int.toString x) ^ "; n: " ^ (Int.toString a_n) ^ "; random: " ^ (Int.toString(random_range 0 100)) ^  "\n"))
    10
    (10,"");

(* print the string *)
TextIO.print s;


(* a datatype for particles *)
datatype particle = 
Particle of {    
  position: int * int, (* x and y *)
  shift: int * int, (* x and y *)
  size: int,
  angle: int,
  speed: real,
  targetSize: int,
  fillColor: string, (* html # colour: .eg. #000000 is black *)
  orbit : real
};

(* make a random colour *)
fun randomColour () = 
    fold_nat (fn x => fn s => s ^ (Int.toString(random_range 0 10)))
             6 "#";

(* value for radius - ? *)
val radius = 3.0;

(* create a new particle *)
fun newParticle {mouseX, mouseY} = 
  Particle {
    position = (mouseX + (random_range 0 10), mouseY + (random_range 0 10)),
    shift = (mouseX + (random_range 0 10), mouseY + (random_range 0 10)),
    size = 1,
    angle = 0,
    speed = 0.01 + (Real.fromInt (random_range 0 10)) * 0.04,
    targetSize = 1,
    fillColor = random_colour(),
    orbit = (Real.fromInt (random_range 0 10)) / 0.3
  };

(* create "n" particles at mouse position *)
fun createParticles mouse n = 
    fold_nat (fn x => fn l => new_particle mouse :: l) n [];


