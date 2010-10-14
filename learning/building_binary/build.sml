PolyML.fullGC ();
use "main.sml";
PolyML.export ("bin/PolyMLext", PolyMLext.main);
val _ = OS.Process.exit OS.Process.success;
