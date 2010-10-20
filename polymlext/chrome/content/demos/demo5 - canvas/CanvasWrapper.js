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
    },
    fillStyle : function(request) {
        var elem = this.Memory.getReference(request.arg1);
        elem.fillStyle = request.arg2;
    },
    strokeStyle : function(request) {
        var elem = this.Memory.getReference(request.arg1);
        elem.strokeStyle = request.arg2;
    },
    lineWidth : function(request) {
        var elem = this.Memory.getReference(request.arg1);
        elem.lineWidth = request.arg2;
    },
    moveTo : function(request) {
        var elem = this.Memory.getReference(request.arg1);
        elem.moveTo(request.arg2, request.arg3);
    },
    lineTo : function(request) {
        var elem = this.Memory.getReference(request.arg1);
        elem.lineTo(request.arg2, request.arg3);
    },
    stroke : function(request) {
        var elem = this.Memory.getReference(request.arg1);
        elem.stroke();
    },
    arc : function(request) {
        var elem = this.Memory.getReference(request.arg1);
        elem.arc(request.arg2, request.arg3, request.arg4, request.arg5, request.arg6, request.arg7);
    },
    fill : function(request) {
        var elem = this.Memory.getReference(request.arg1);
        elem.fill();
    },
    fillRect : function(request) {
        var elem = this.Memory.getReference(request.arg1);
        elem.fillRect(request.arg2, request.arg3, request.arg4, request.arg5);
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

