signature JS = 
  sig
    (* dom *)
    eqtype doc 
    eqtype elem
    (*val document        : doc*)
    val getElementById  : doc -> string -> elem option
    val innerHTML       : elem -> string
  end
  
structure Js : JS =
struct
    type doc = string
    type elem = string
    (*val document = doc;*)

    fun getElementById (d:doc) (id:string) : elem option =
        NONE;
             
    fun innerHTML (e:elem) = "boo";
end;
