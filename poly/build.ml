PolyML.fullGC ();
use "ext.ml";
PolyML.export ("bin/PolyMLext", PolyMLext.main);
val _ = OS.Process.exit OS.Process.success;
