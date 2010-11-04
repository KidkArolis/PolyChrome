open DOM;

fun s2i s = valOf (Int.fromString s);
fun i2s i = Int.toString i;

val e = valOf (getElementById "abc");

val but1 = valOf (getElementById "button1");
val but2 = valOf (getElementById "button2");
val rem1 = valOf (getElementById "remove1");
val rem2 = valOf (getElementById "remove2");

setAttribute rem1 "listener" "on";
setAttribute rem2 "listener" "on";

val listener1 = ref ((EventListener Name.default_name):eventListener);
val listener2 = ref ((EventListener Name.default_name):eventListener);


fun applyOperation operation =
    let
        val current_value = getInnerHTML e
        val new_value = i2s (operation((s2i current_value), 1))
        val _ = setInnerHTML e new_value
    in
        ()
    end;

fun removeToggle1 (_) =
    let
      val e = rem1
      val a = getAttribute e "listener"
      val _ = if (a="on")
              then (setValue e "add first listener")
              else (setValue e "remove first listener");
      val _ = if (a="on")
              then (removeEventListener (!listener1))
              else (listener1 := addEventListener
                    but1
                    click
                    (EventHandler (fn(_)=>applyOperation op+)));
      val _ = if (a="on")
              then setAttribute e "listener" "off"
              else setAttribute e "listener" "on";
    in
      ()
    end;

fun removeToggle2 (_) =
    let
      val e = rem2
      val a = getAttribute e "listener"
      val _ = if (a="on")
              then (setValue e "add first listener")
              else (setValue e "remove first listener");
      val _ = if (a="on")
              then (removeEventListener (!listener2))
              else (listener2 := addEventListener
                    but2
                    click
                    (EventHandler (fn(_)=>applyOperation op-)));
      val _ = if (a="on")
              then setAttribute e "listener" "off"
              else setAttribute e "listener" "on";
    in
      ()
    end;



val l1 = addEventListener but1 click (EventHandler (fn(_)=>applyOperation op+));
removeEventListener l1;
(*
doing it again would throw an exception
removeEventListener l1;
*)

val _ = listener1 := addEventListener but1 click (EventHandler (fn(_)=>applyOperation op+));
val _ = listener2 := addEventListener but2 click (EventHandler (fn(_)=>applyOperation op-));

addEventListener rem1 click (EventHandler removeToggle1);
addEventListener rem2 click (EventHandler removeToggle2);