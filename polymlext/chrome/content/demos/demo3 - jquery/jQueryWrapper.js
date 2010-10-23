var jQueryWrapper = {
    select : function(request) {
        var elements = $(request.arg1);
        response = "";
        if (elements.length>0) {
            for (var i=0, len=elements.length; i<len; i++) {
                response += this.Memory.addReference(elements[i])+",";
            }
            response = response.substr(0, response.length-1)
        }
        return response;
    }
}
