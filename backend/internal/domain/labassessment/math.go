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
