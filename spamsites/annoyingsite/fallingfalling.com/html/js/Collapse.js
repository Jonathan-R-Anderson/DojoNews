(function(window) {	
	
	var Collapse = function(colors) 
	{
		this.initialize(colors);
	}
	
	var p = Collapse.prototype = new Shape();
	p.color;
	p.points;
	p.paths;
	p.ticks = 0;
	p.goal = new Point(.5,.5);
	
	p.initialize = function(colors) 
	{
		Shape.prototype.initialize.apply(this);
		this.colors = colors;
		//
		this.duration = Config.duration;
		this.initPaths();
	}
	
	p.initPaths = function()
	{
		var b = [];//beginpoints
		//random: point on left side?
		if (Math.random() < Config.chanceExtraSidePoint)
		{
			var py = (Math.random() * .4 - .2 + .5);
			b.push(new Point(0, py));
		}
		//add TL
		b.push(new Point(0, 0));
		//determine amount of extra points on T
		var n = RandomUtil.range(Config.extraPointsMin, Config.extraPointsMax+1, 0);//0/1/2
		//add points
		var p = 1 / (n+1);//width divided by nr of vertices
		for (var i=1; i <= n; i++)
		{
			var px = p * i;
			px += (Math.random() * .4 - .2) * p;
			b.push(new Point(px, 0));
		}
		//add TR
		b.push(new Point(1, 0));
		//random: point on right side?
		if (Math.random() < Config.chanceExtraSidePoint)
		{
			py = (Math.random() * .4 - .2 + .5);
			b.push(new Point(1, py));
		}
		//(points are added CW from BL by intent!)
		//determine goals and create paths/tweens
		p = 1 / (b.length + 1);
		this.paths = [];
		this.paths.push(new Point(0,1));//add BL
		for (i = 0; i < b.length;i++)
		{
			var v = new IrregularPath(b[i], new Point((i + 1) * p, 1));
			this.paths.push(v);
		}
		this.paths.push(new Point(1,1));//add BR
		//
		this.step = 0;
	}
	
	p.update = function()
	{
		this.ticks ++;
		if (this.ticks > this.duration)
		{
			if (this.onComplete) this.onComplete();
		}
		else
		{
			//move each vertex toward goal
			var r = ClassicEase.ease(this.ticks, 0, 1, this.duration, Config.ease);
			for (var i=1;i<this.paths.length-1;i++)
			{
				var v = this.paths[i];
				v.update(r);
			}
			//this.colorManager.update(r);
			var color = ColorUtil.interpolateHex(this.colors[1], this.colors[0], r);
			this._draw(color);
		}
	}
		
	p._draw = function(color)
	{
		var w = Config.width;
		var h = Config.height;
		var g = this.graphics;
		g.clear();
		//g.beginStroke(this.color).setStrokeStyle(2);
		g.beginFill(color);
		var p = this.paths[this.paths.length-1];		
		g.moveTo(p.x * w, p.y * h);
		for (var i=0;i<this.paths.length;i++)
		{
			p = this.paths[i];
			g.lineTo(p.x*w, p.y*h);
		}
		g.endFill();
	}	

	window.Collapse = Collapse;
}(window));