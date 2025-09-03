var MathUtil = {};

MathUtil.sgn = function(value)
{
	return value==0?0:(value > 0?1: -1);
}

	
MathUtil.round = function(value, decimals)
{
	return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
}