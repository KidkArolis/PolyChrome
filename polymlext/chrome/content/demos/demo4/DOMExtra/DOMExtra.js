var DOMExtra = {
    //polling mouse coordinates
    getMouseCoords : function(request) {
        this.mouseCoordsPollingActive = true;
        if (this.mouseX === undefined) {
            this.mouseX = 0;
            this.mouseY = 0;
            
            self = this;
            this.setCoords = function(event) {
                window.removeEventListener("mousemove", self.setCoords,
                        false)
                self.mouseX = event.clientX;
                self.mouseY = event.clientY;
                self.mouseCoordsTimeout = window.setTimeout(poll, 20);
            }
            var poll = function() {
                if (self.mouseCoordsPollingActive) {
                    window.addEventListener("mousemove", self.setCoords,
                            false);
                }
            }
            poll();
        }
        
        return this.mouseX+","+this.mouseY;
    },
    cancelMouseCoordsPolling : function(request) {
        this.mouseCoordsPollingActive = false;
        if (this.mouseCoordsTimeout != null) {
            window.clearTimeout(this.mouseCoordsTimeout);
        }
        window.removeEventListener("mousemove", this.setCoords, false);
        return null;
    }
}