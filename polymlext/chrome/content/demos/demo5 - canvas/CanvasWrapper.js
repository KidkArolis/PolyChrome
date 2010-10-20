var CanvasWrapper = {
    getContext : function(request) {
        //TODO this is .. temporarily hardcoded
        var elem = this.Memory.getReference(request.arg1);
        var context = document.getElementById("world").getContext("2d");
        return this.Memory.addReference(context);
    },
    beginPath : function(request) {
        var elem = this.Memory.getReference(request.arg1);
        elem.beginPath();
        return null;
    },
    fillStyle : function(request) {
        var elem = this.Memory.getReference(request.arg1);
        elem.fillStyle = request.arg2;
        return null;
    },
    strokeStyle : function(request) {
        var elem = this.Memory.getReference(request.arg1);
        elem.strokeStyle = request.arg2;
        return null;
    },
    lineWidth : function(request) {
        var elem = this.Memory.getReference(request.arg1);
        elem.lineWidth = request.arg2;
        return null;
    },
    moveTo : function(request) {
        var elem = this.Memory.getReference(request.arg1);
        elem.moveTo(request.arg2, request.arg3);
        return null;
    },
    lineTo : function(request) {
        var elem = this.Memory.getReference(request.arg1);
        elem.lineTo(request.arg2, request.arg3);
        return null;
    },
    stroke : function(request) {
        var elem = this.Memory.getReference(request.arg1);
        elem.stroke();
        return null;
    },
    arc : function(request) {
        var elem = this.Memory.getReference(request.arg1);
        elem.arc(request.arg2, request.arg3, request.arg4, request.arg5, request.arg6, request.arg7);
        return null;
    },
    fill : function(request) {
        var elem = this.Memory.getReference(request.arg1);
        elem.fill();
        return null;
    },
    fillRect : function(request) {
        var elem = this.Memory.getReference(request.arg1);
        elem.fillRect(request.arg2, request.arg3, request.arg4, request.arg5);
        return null;
    },
    canvasWidth : function(request) {
        var elem = this.Memory.getReference(request.arg1);
        return elem.canvas.width;
    },
    canvasHeight : function(request) {
        var elem = this.Memory.getReference(request.arg1);
        return elem.canvas.height;
    }
}

