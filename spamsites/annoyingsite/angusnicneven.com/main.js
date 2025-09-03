document.addEventListener("DOMContentLoaded", function() {
	autoplay = document.getElementById("autoplay")
	promise = autoplay.play()

	if (promise !== undefined) {
		promise
			.catch(function() {
				autoplayCover = document.createElement("div")
				autoplayCover.id = "autoplay-cover"

				autoplayCover.innerHTML =
					`<img src="/images/ListenWell.gif" draggable="false">
					<p style="color: #C1B492;">
						Ｓｏｍｅｔｈｉｎｇ  ｈａｓ  ｏｂｆｕｓｃａｔｅｄ  ｔｈｅｉｒ  ｖｏｉｃｅｓ  ｏｎｃｅ  ｍｏｒｅ．．．<br>
						<br>
						Ｎｏ  ｍａｔｔｅｒ，  Ｉ  ｓｈａｌｌ  ｍａｋｅ  ｙｏｕ  <span style="color: #D2738A;">ＬＩＳＴＥＮ</span>．
					</p>`

				document.body.appendChild(autoplayCover)

				autoplayCover.addEventListener("click", function() {
					autoplayCover.className = "hide"
				
					setTimeout(function() {
						document.body.removeChild(autoplayCover)
					},
					500)

					playaudio()
				})
			})
	}

	function playaudio() {
		autoplay.play()
		
		setInterval(function() {
			if (autoplay.paused) {
				autoplay.play()
			}
		},
		10)
	}
})

window.addEventListener("load", function() {


	var cursorContainer = document.createElement("div");
	cursorContainer.id = "cursor-container";

	var cursor = document.createElement("div");
	cursor.id = "cursor";
	cursorContainer.appendChild(cursor);

	document.body.appendChild(cursorContainer);

	window.addEventListener("mousemove", function(event) {
		cursor.style.transform = "translate(" + (event.pageX - 13) + "px," + (event.pageY - 13) + "px)";
	});
	window.addEventListener("mouseover", function(event) {
		var isHover = false;
		for (var i=0; i<event.path.length; i++) {
			if (event.path[i].nodeName == "A") {
				isHover = true;
				break;
			}
		}
		cursor.className = isHover ? "hover" : "";
	});
});
