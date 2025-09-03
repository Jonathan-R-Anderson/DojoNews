(function(window) {

/**
* Simple sound controller using Buzz sound library.
**/
var SoundController = {};

SoundController.sounds = {};

SoundController.init = function(sounds)
{
	//preload sounds
	//sounds: [{id:'path/file_without_extension', loop:true}]
	if (sounds)
	{
		for (var i=0;i<sounds.length;i++)
		{
			var item = sounds[i];
			var id = item.id;
			var params = {};
			params.preload = item.preload==null ? true : item.preload;
			params.autoplay = item.autoplay==null ? false : item.autoplay;
			params.formats = item.formats==null ? ["ogg", "mp3"]  : item.formats;
			params.loop = item.loop==null ? false  : item.loop;
			SoundController.sounds[id] = new buzz.sound(id, params);
			if (params.autoplay) SoundController.sounds[id].play();//because autoplay ignored on ios
		}	
	}
}
SoundController.play = function(id)
{
	if (SoundController.getMute()) return;
	//var src = "sounds/checkers-sound-"+idx;
	//var sound = new buzz.sound( [src+".ogg", src+".mp3"], { preload:true, autoplay:true } );
	//sound.load();
	sound = SoundController.sounds[id];//use preloaded sound
	if (sound) sound.play();
	//if (SoundController.getMute()) SoundController.setMute(true);
}

SoundController.setMute = function(on)
{
	if (on) buzz.all().mute();
	else buzz.all().unmute();
	SoundController.muted = on;
	
}
SoundController.getMute = function()
{
	return SoundController.muted;
}

window.SoundController = SoundController;
}(window));