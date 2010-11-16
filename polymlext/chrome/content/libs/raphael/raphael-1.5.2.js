var Raphael = {
    Raphael : function(request) {
        var paper = Raphael(request.arg1, request.arg2, request.arg3, request.arg4);
        return this.Memory.addReference(paper);
    }
}
