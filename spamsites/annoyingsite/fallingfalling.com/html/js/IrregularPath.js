(function(window) {	
	
	var IrregularPath = function(begin, end) 
	{
		this.initialize(begin, end);
	}
	
	var p = IrregularPath.prototype;
	
	p.initialize = function(begin, end) 
	{
		this.b = begin;
		this.e = end;
		//determine random path
		this.path = [];
		var x0 = MathUtil.round(Math.random() * .1 ,3);
		var x1 = MathUtil.round(1 - Math.random() * .1, 3);
		this.path.push([x0, 0]);//startdelay
		//generate irregular points in between
		var n = 2;
		var xs = (x1 - x0) / (n+1);
		var ys = 1 / (n+1);
		for (var i = 1; i <= n; i++)
		{
			var xi = x0 + i * xs;
			xi += (Math.random() * .4 - .2) * xs;
			var yi = i * ys;
			yi += (Math.random() * .4 - .2) * ys;
			this.path.push([MathUtil.round(xi,3), MathUtil.round(yi,3)]);
		}
		this.path.push([x1, 1]);//early end
		//trace(id, this.path);
		this.x = begin.x;
		this.y = begin.y;
	}
		
		
	p.update = function(r)
	{
		var prev = this.path.length-1;
		for (var i = 0; i < this.path.length; i++)
		{
			if (this.path[i][0]==1 || this.path[i][0] > r) 
			{
				prev = i-1;
				break;
			}
		}
		var eP = prev == -1 ? [0,0] : this.path[prev];
		var eN = prev < this.path.length - 1 ? this.path[prev + 1] : [1, 1];
		//interpolate
		var r2 = eP[1] + ((r - eP[0]) / (eN[0] - eP[0])) * (eN[1] - eP[1]);

		this.x = this.b.x + (this.e.x - this.b.x) * r2;
		this.y = this.b.y + (this.e.y - this.b.y) * r2;
	}

	window.IrregularPath = IrregularPath;
}(window));