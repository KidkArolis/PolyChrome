open DOM

(*Random numbers*)
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


(*helpers*)
fun fold_nat f i a =
   if i <= 0 then a else fold_nat f (i - 1) (f i a);

(********************************)
(*the actual Canvas demo*)
val RADIUS = 1.0;
val RADIUS_SCALE = 120.0;
val QUANTITY = 10;

val mouseX = ref (0:int);
val mouseY = ref (0:int);

val drawInterval = 40;
val frameCount = ref (0:int);
val fps = ref (0:int);
val maxfps = round(1000.0 / Real.fromInt(drawInterval));
val lastTime = ref (Time.now():Time.time);
val fpsDisplay = valOf (getElementById "fps");

val canvas = valOf (getElementById "world");
val context = Canvas.getContext canvas "2d";
datatype particle =
  Particle of {
    id: int,
    position: int * int, (* x and y *)
    shift: int * int, (* x and y *)
    size: real,
    angle: real,
    speed: real,
    targetSize: real,
    fillColor: string, (* html # colour: .eg. #000000 is black *)
    orbit : real
  };

fun randomColour () = fold_nat (fn x => fn s => s ^ (Int.toString(random_range 0 9))) 4 "#CF";

fun newParticle (x) =
 Particle {
   id = x,
   position = (!mouseX, !mouseY),
   shift = (!mouseX, !mouseY),
   size = 2.0,
   angle = 0.0,
   speed = 0.01 + (Real.fromInt (random_range 0 10)) * 0.004,
   targetSize = 5.0,
   fillColor = (randomColour()),
   orbit = RADIUS*0.5 + (RADIUS*0.05*(Real.fromInt (random_range 0 10)))
 }

val particles = ref (fold_nat (fn x => fn l => newParticle(x) :: l) QUANTITY []);

fun mouseMoveHandler (eventData) = let
    val [x,y] = String.tokens (fn (#",") => true | _ => false) eventData;
    val _ = (mouseX := valOf (Int.fromString x));
    val _ = (mouseY := valOf (Int.fromString y));
  in () end;

onMouseMove canvas (EventHandler mouseMoveHandler);

fun drawAndUpdateParticle (p:particle) =
  let
    val Particle {
      id = id,
      position = (posx,posy),
      shift = (shiftx,shifty),
      size = size,
      angle = angle,
      speed = speed,
      targetSize = targetSize,
      fillColor = fillColor,
      orbit = orbit
    } = p;
    
    val angle_new = angle + speed;

    val shiftx_new = shiftx + round(Real.fromInt(((!mouseX) - shiftx)) * (speed));
    val shifty_new = shifty + round(Real.fromInt(((!mouseY) - shifty)) * (speed));

    val posx_new = shiftx_new + round(Math.cos(Real.fromInt id + angle_new)*orbit*RADIUS_SCALE);
    val posy_new = shifty_new + round(Math.sin(Real.fromInt id + angle_new)*orbit*RADIUS_SCALE);
    
    val size_new = size + (targetSize - size) * 0.05;
    
    val targetSize_new = if (round(targetSize))=(round(size_new)) then Real.fromInt((1+(random_range 1 7))) else targetSize;

    val _ = Canvas.beginPath context;
    val _ = Canvas.fillStyle context fillColor;
    val _ = Canvas.strokeStyle context fillColor;
    val _ = Canvas.lineWidth context size;
    val _ = Canvas.moveTo context posx posy;
    val _ = Canvas.lineTo context posx_new posy_new;
    val _ = Canvas.stroke context;
    val _ = Canvas.arc context posx_new posy_new (size/2.0) 0.0 6.28 true;
    val _ = Canvas.fill context;
  in
    Particle {
      id = id,
      position = (posx_new,posy_new),
      shift = (shiftx_new,shifty_new),
      size = size_new,
      angle = angle_new,
      speed = speed,
      targetSize = targetSize_new,
      fillColor = fillColor,
      orbit = orbit
    }
  end;

fun loop () =
  let
    val nowTime = Time.now();
    val diffTime = (Time.toMilliseconds nowTime)-(Time.toMilliseconds (!lastTime));
    val (_,_,_) = if (diffTime >= 1000) then (fps:=(!frameCount),frameCount:=0,lastTime:=nowTime) else ((),(),());
  
    val _ = Canvas.fillStyle context "rgba(255,255,255,0.05)";
    val _ = Canvas.fillRect context 0 0 (Canvas.canvasWidth context) (Canvas.canvasHeight context);

    val new_particles = map drawAndUpdateParticle (!particles);
    val _ = (particles := new_particles);
    
    (*update fps display*)
    val _ = setInnerHTML fpsDisplay ((Int.toString (!fps)) ^ "fps");
    
    val _ = (frameCount := !frameCount+1);
  in
    ()
  end;

val _ = setInterval (TimerHandler loop) drawInterval;