(function(window) {	
	var FallingMain = function(stage) 
	{
		this.stage = stage;
		this.initialize();
	}
	//
	var p = FallingMain.prototype = new Container();
	p.items = [];
	p.bg;
	p.ticks;
	p.tickNext;
	p.paused = false;
	//
	p.initialize = function() 
	{
		Container.prototype.initialize.apply(this);
		SoundController.init([{id:"sounds/falling",loop:true}]);
		var that = this;
		document.addEventListener('keyup', function(e) { that.handleKeyUp(e);});
		window.onclick = function(e) { that.onClick(e); };
		this.pickNextColor();
	}
	
	p.onClick = function(e)
	{
		SoundController.play("sounds/falling", {loop:true});
		e.preventDefault();
	}
	p.handleKeyUp = function(e)
	{
		var c = String.fromCharCode(e.keyCode);
		if (c=="P") this.paused = !this.paused;
		if (c=="S") SoundController.setMute(!SoundController.getMute());
		else if (c=="N") this.update();
	}
	
	p.start = function()
	{
		Ticker.useRAF = true;
		Ticker.setFPS(Config.framerate);
		Ticker.addListener(this);
		//
		this.ticks = 0;
		this.addItem();
		this.stage.update();
		//this.paused = true;
		SoundController.play("sounds/falling");
	}	
	
	p.tick = function()
	{
		if (this.paused) return;
		this.update();
	}
	
	p.update = function()
	{
		this.ticks ++;
		if (this.ticks >= this.tickNext)
		{
			this.addItem();
		}
		for (var i=0;i<this.items.length;i++)
		{
			this.items[i].update();
		}
		this.stage.update();
	}
	
	p.addItem = function()
	{
		var item = new Collapse(this.colorsNext);
		var that = this;
		item.onComplete = function() { that.removeFirstItem(); };
		this.addChildAt(item, 1);
		this.items.push(item);
		this.tickNext = this.ticks + RandomUtil.range(Config.intervalMin, Config.intervalMax+1, 0);
		this.pickNextColor();
	}
	
	p.colorHistory = [];
	p.pickNextColor = function()
	{
		this.colorsNext = [];
		for (var j=0;j<2;j++)
		{
			var color = RandomUtil.pick(Config.colors, this.colorHistory);
			//if (lastColors.length>1) trace(picked.toString(16) , ": ",lastColors[1].toString(16),lastColors[0].toString(16));
			this.colorHistory.push(color);
			while (this.colorHistory.length > 2) this.colorHistory.shift();
			this.colorsNext.push(color);
		}
		this.drawBackground();
	}
	
	p.drawBackground = function()
	{
		if (!this.bg) 
		{
			this.bg = new Shape();
			this.addChildAt(this.bg, 0);
		}
		var g = this.bg.graphics;
		g.clear();
		g.beginFill(this.colorsNext[0]);
		g.drawRect(0,0,Config.width,Config.height);
	}
	
	p.removeFirstItem = function()
	{
		var item = this.items.shift();
		item.onComplete = null;
		this.removeChild(item);
		//console.log(this.getNumChildren(), this.items.length);
	}
	
	p.onResize = function(w,h)
	{
		Config.width = w;
		Config.height = h;
		this.drawBackground();
	}
	
	window.FallingMain = FallingMain;
}(window));