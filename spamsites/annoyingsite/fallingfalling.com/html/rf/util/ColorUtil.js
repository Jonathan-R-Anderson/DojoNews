var ColorUtil = { };

/**
 * Colors from and to as hex string (ex: "#RRGGBB")
 **/
ColorUtil.interpolateHex = function(from, to, ratio)
{
	var res = ColorUtil.interpolate(parseInt(to.substr(-6), 16), parseInt(from.substr(-6), 16), ratio);
	return "#"+("0000"+res.toString(16)).substr(-6);
}

/**
 * Colors from and to as numbers (ex: 0xRRGGBB)
 **/
ColorUtil.interpolate = function(from, to, ratio)
{
	var r = Math.round(((to>>16) - (from>>16)) * ratio + (from>>16));
	var g = Math.round(((to>>8&255) - (from>>8&255)) * ratio + (from>>8&255));
	var b = Math.round(((to&255) - (from&255)) * ratio + (from&255));
	return (r<<16)+(g<<8)+b;
}

/**
 * Colors from and to as arrays [r,g,b]
 **/
ColorUtil.interpolateArray = function(from, to, ratio)
{
	var res = [];
	res[0] = Math.floor((to[0] - from[0]) * ratio + from[0]);
	res[1] = Math.floor((to[1] - from[1]) * ratio + from[1]);
	res[2] = Math.floor((to[2] - from[2]) * ratio + from[2]);
	return res;
}

/**
 * Colors from and to as objects {red,green,blue}
 **/
ColorUtil.interpolateRGB = function(from, to, ratio)
{
	var res = from.clone();
	res.red = (to.red - from.red) * ratio + from.red;
	res.green = (to.green - from.green) * ratio + from.green;
	res.blue = (to.blue - from.blue) * ratio + from.blue;
	return res;
}