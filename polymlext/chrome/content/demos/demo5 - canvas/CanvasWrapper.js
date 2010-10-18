var CanvasWrapper = {
    getContext : function(request) {
        //TODO this is .. temporarily hardcoded
        var elem = this.Memory.getReference(request.arg2);
        var context = document.getElementById("world").getContext("2d");
        return this.Memory.addReference(context);
    },
    beginPath : function(request) {
        var elem = this.Memory.getReference(request.arg2);
        elem.beginPath();
    },
    fillStyle : function(request) {
        var elem = this.Memory.getReference(request.arg2);
        elem.fillStyle = request.arg3;
    },
    strokeStyle : function(request) {
        var elem = this.Memory.getReference(request.arg2);
        elem.strokeStyle = request.arg3;
    },
    lineWidth : function(request) {
        var elem = this.Memory.getReference(request.arg2);
        elem.lineWidth = request.arg3;
    },
    moveTo : function(request) {
        var elem = this.Memory.getReference(request.arg2);
        elem.moveTo(parseInt(request.arg3.replace("~","-")), parseInt(request.arg4.replace("~","-")));
    },
    lineTo : function(request) {
        var elem = this.Memory.getReference(request.arg2);
        elem.lineTo(parseInt(request.arg3.replace("~","-")), parseInt(request.arg4.replace("~","-")));
    },
    stroke : function(request) {
        var elem = this.Memory.getReference(request.arg2);
        elem.stroke();
    },
    arc : function(request) {
        var elem = this.Memory.getReference(request.arg2);
        elem.arc(parseInt(request.arg3.replace("~","-")), parseInt(request.arg4.replace("~","-")), request.arg5, request.arg6, request.arg7, request.arg8);
    },
    fill : function(request) {
        var elem = this.Memory.getReference(request.arg2);
        elem.fill();
    },
    fillRect : function(request) {
        var elem = this.Memory.getReference(request.arg2);
        elem.fillRect(request.arg3, request.arg4, request.arg5, request.arg6);
    },
    canvasWidth : function(request) {
        var elem = this.Memory.getReference(request.arg2);
        return elem.canvas.width;
    },
    canvasHeight : function(request) {
        var elem = this.Memory.getReference(request.arg2);
        return elem.canvas.height;
    }
}

