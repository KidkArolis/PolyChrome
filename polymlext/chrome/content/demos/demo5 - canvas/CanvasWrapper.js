var CanvasWrapper = {
    processRequest : function(request, Memory) {
        var response = "";
        switch (request.arg1) {
            case "getContext":
                //TODO this is .. temporarily hardcoded
                var elem = Memory.getElement(request.arg2);
                var context = document.getElementById("world").getContext("2d");
                response = Memory.addElement(context);
                break;
            case "beginPath":
                var elem = Memory.getElement(request.arg2);
                elem.beginPath();
                break;
            case "fillStyle":
                var elem = Memory.getElement(request.arg2);
                elem.fillStyle = request.arg3;
                break;
            case "strokeStyle":
                var elem = Memory.getElement(request.arg2);
                elem.strokeStyle = request.arg3;
                break;
            case "lineWidth":
                var elem = Memory.getElement(request.arg2);
                elem.lineWidth = request.arg3;
                break;
            case "moveTo":
                var elem = Memory.getElement(request.arg2);
                elem.moveTo(parseInt(request.arg3.replace("~","-")), parseInt(request.arg4.replace("~","-")));
                break;
            case "lineTo":
                var elem = Memory.getElement(request.arg2);
                elem.lineTo(parseInt(request.arg3.replace("~","-")), parseInt(request.arg4.replace("~","-")));
                break;
            case "stroke":
                var elem = Memory.getElement(request.arg2);
                elem.stroke();
                break;
            case "arc":
                var elem = Memory.getElement(request.arg2);
                elem.arc(parseInt(request.arg3.replace("~","-")), parseInt(request.arg4.replace("~","-")), request.arg5, request.arg6, request.arg7, request.arg8);
                break;
            case "fill":
                var elem = Memory.getElement(request.arg2);
                elem.fill();
                break;
            case "fillRect":
                var elem = Memory.getElement(request.arg2);
                elem.fillRect(request.arg3, request.arg4, request.arg5, request.arg6);
                break;
            case "canvasWidth":
                var elem = Memory.getElement(request.arg2);
                response = elem.canvas.width+"";
                break;
            case "canvasHeight":
                var elem = Memory.getElement(request.arg2);
                response = elem.canvas.height+"";
                break;

        }
        return response;
    }
}

