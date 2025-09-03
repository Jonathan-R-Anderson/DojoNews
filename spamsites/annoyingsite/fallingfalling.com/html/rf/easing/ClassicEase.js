/**
 * Ease function that replicates the classic tween ease of the flash IDE
 * Can be used by TweenLite/TweenMax etc
 * @param	t elapsed time of tween
 * @param	b offset at t=0
 * @param	c total offset (max output value minus b, at t=d)
 * @param	d duration of tween
 * @param	v classic ease value in range [-100,100] where a value < 0 is easeIn and value > 0 is easeOut. Larger values are also valid!
 * @return output value in range [b..(b+c)]
 */
var ClassicEase = {};
ClassicEase.ease = function(t, b, c, d, v)
{
	//v == 0 : exponent = 1
	//v == (-)100 : exponent = 2
	if (v >= 0) return b + c * (1 - Math.pow((1 - t/d), 1 + Math.abs(v / 100) ));
	return b + c * (Math.pow(t/d, 1 + Math.abs(v / 100) ));
}