var piece;
var canvasId = 'myCanvas';
var resizeTimeout;

function init()
{
	var canvas = document.getElementById(canvasId);
	//catch/block touch events to prevent def browser behaviour
	if (window.ontouchstart !== undefined)
	{
		canvas.addEventListener( 'touchmove', function(e) { e.preventDefault(); });
		canvas.addEventListener( 'touchstart', function(e) { e.preventDefault(); });
		canvas.addEventListener( 'touchend', function(e) { e.preventDefault(); });
	}
	//
	var stage = new Stage(canvas);
	piece = new FallingMain(stage);
	stage.addChild(piece);
	Touch.enable(stage);
	//if no parent, we are not in an iframe so we handle resizing ourselves
	if (!window.parent || window.parent.onResize==null)
	{
		window.onresize = function() { onWindowResize(); };
		window.onorientationchange = function() { onWindowResize(); };
	}
	onWindowResize(true);
	//
	piece.start();
}

function onWindowResize(instant)
{
	setSize(window.innerWidth, window.innerHeight, instant);
}
function setSize(w,h, instant)
{
	//can also be called from parent window
	//if (resizeTimeout!=null) clearTimeout(resizeTimeout);
	//if (!instant) resizeTimeout = setTimeout(function() { setSizeDelayed(w,h); }, 150);
	//else setSizeDelayed(w,h);
	setSizeDelayed(w,h);
}
function setSizeDelayed(w,h)
{
	if (resizeTimeout!=null) clearTimeout(resizeTimeout);
	var canvas = document.getElementById(canvasId);
	canvas.width = w;//dont set style.width because this would scale the canvas bitmap
	canvas.height = h;
	if (piece) piece.onResize(w,h);
}

function trace(str)
{
	if (document.getElementById("output")) document.getElementById("output").innerHTML = str;
}