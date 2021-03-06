fun copyTextFile(infile: string, outfile: string) =
  let
    val ins = TextIO.openIn infile
    val outs = TextIO.openOut outfile
    fun helper(copt: char option) =
      case copt of
           NONE => (TextIO.closeIn ins; TextIO.closeOut outs)
         | SOME(c) => (TextIO.output1(outs,c); helper(TextIO.input1 ins))
  in
    helper(TextIO.input1 ins)
  end
