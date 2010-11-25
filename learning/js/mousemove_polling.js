function printCoords (event) {
	console.log(event.clientX + " " + event.clientY);
	setTimeout(poll, 100);
}
function poll() {
	 $("body").one('mousemove', printCoords);
}
poll();