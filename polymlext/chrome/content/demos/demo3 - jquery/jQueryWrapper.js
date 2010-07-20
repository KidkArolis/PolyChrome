var jQueryWrapper = {
    processRequest : function(request, Memory) {
        var response = "";
        switch (request.arg1) {
            case "select":
                var elements = $(request.arg2);
                response = "[";
                if (elements.length>0) {
                    for (var i=0, len=elements.length; i<len; i++) {
                        response += "\""+Memory.addElement(elements[i])+"\",";
                    }
                    response = response.substr(0, response.length-1)
                }
                response += "]";
                break;
        }
        return response;
    }
}

