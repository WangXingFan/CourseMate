package labassessment

import "math"

func Notch(center, alpha, frequency float64) float64 {
	if alpha == 0 {
		return 1
	}
	w0, w := 2*math.Pi*center, 2*math.Pi*frequency
	a := w0*w0 - w*w
	return math.Abs(a) / math.Hypot(a+alpha*alpha, 2*alpha*w)
}
func ECG(t float64) float64 {
	if t < 0 {
		return 0
	}
	value := 0.02*math.Sin(2*math.Pi*5*t) + 0.2*math.Sin(2*math.Pi*50*t)
	for beat := int(math.Floor(t)) - 1; beat <= int(math.Floor(t))+1; beat++ {
		for _, p := range [][3]float64{{.12, .2, .04}, {-.15, .37, .012}, {1, .4, .012}, {-.25, .43, .012}, {.3, .65, .07}} {
			value += p[0] * math.Exp(-.5*math.Pow((t-float64(beat)-p[1])/p[2], 2))
		}
	}
	return value
}
func MovingAverage(t, width float64) float64 {
	n := int(math.Ceil(width / .0001))
	sum := 0.
	for i := 0; i < n; i++ {
		sum += ECG(t - (float64(i)+.5)*width/float64(n))
	}
	return sum / float64(n)
}
func HarmonicMaximum(k int) float64 {
	maximum := 0.
	for i := 0; i <= 20000; i++ {
		v := 0.
		phase := 2 * math.Pi * float64(i) / 20000
		for j := 1; j <= k; j += 2 {
			v += 4 / (math.Pi * float64(j)) * math.Sin(float64(j)*phase)
		}
		maximum = math.Max(maximum, v)
	}
	return maximum
}
func Alias(f, fs float64) float64 { r := math.Mod(f, fs); return math.Min(r, fs-r) }
