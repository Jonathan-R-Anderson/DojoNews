
var RandomUtil = {};

RandomUtil.pick = function(pool, exceptions)
{
	if (exceptions != null)
	{
		var pool = pool.concat([]);
		for (var i = 0; i < pool.length; i++)
		{
			if (exceptions.indexOf(pool[pool.length - 1 - i]) > -1) pool.splice(pool.length - 1 - i, 1);
		}
	}
	return pool[Math.floor(Math.random() * pool.length)];
}

RandomUtil.range = function(min, max, decimals)
{
	var n = Math.random() * (max-min) + min;
	//not uniform for rounded values! should use floor instead!
	if (decimals!=null && decimals>-1) return Math.floor(n * Math.pow(10, decimals)) / Math.pow(10, decimals);
	else return n;
}