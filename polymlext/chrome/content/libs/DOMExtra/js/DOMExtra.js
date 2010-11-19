var DOMExtraLib = function(memory, poly) {
    this.Memory = memory;
    this.poly = poly;
}
DOMExtraLib.prototype = {
    //polling mouse coordinates
    getMouseCoords : function(request) {
        this.mouseCoordsPollingActive = true;
        if (this.mouseX === undefined) {
            this.mouseX = 0;
            this.mouseY = 0;
            
            self = this;
            var unsafeWin = document.defaultView.wrappedJSObject;
            this.setCoords = function(event) {
                unsafeWin.removeEventListener("mousemove", self.setCoords,
                        false)
                self.mouseX = event.clientX;
                self.mouseY = event.clientY;
                self.mouseCoordsTimeout = unsafeWin.setTimeout(poll, 35);
            }
            var poll = function() {
                if (self.mouseCoordsPollingActive) {
                    unsafeWin.addEventListener("mousemove", self.setCoords,
                            false);
                }
            }
            poll();
        }
        
        return this.mouseX+","+this.mouseY;
    },
    cancelMouseCoordsPolling : function(request) {
        this.mouseCoordsPollingActive = false;
        var unsafeWin = document.defaultView.wrappedJSObject;
        if (this.mouseCoordsTimeout != null) {
            unsafeWin.clearTimeout(this.mouseCoordsTimeout);
        }
        unsafeWin.removeEventListener("mousemove", this.setCoords, false);
        return null;
    }
}