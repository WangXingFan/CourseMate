package labassessment

import (
	"fmt"
	"math"
	"math/rand"
)

var Titles = map[string]string{"L1-1": "信号变换与窄脉冲", "L1-2": "系统性质检验", "L1-3": "响应分解", "L1-4": "卷积与心电滑动平均", "L2-1": "方波谐波合成", "L2-2": "矩形脉冲与连续频谱", "L2-3": "心电工频陷波设计", "L2-4": "采样与混叠", "L3-1": "信号与拉氏变换", "L3-2": "一阶系统响应", "L3-3": "心电陷波零极点", "L3-4": "最短达标脉宽"}

func number(id, label, unit string, points, value float64, explanation string) Field {
	return Field{ID: id, Label: label, Unit: unit, Points: points, Expected: value, Kind: "number", Explanation: explanation}
}
func integer(id, label string, points, value float64) Field {
	f := number(id, label, "", points, value, "按定义计算整数或判断类别。")
	f.Kind = "integer"
	return f
}
func choice(id, label string, points float64, correct string, other []string, seed int) Field {
	texts := append([]string{correct}, other...)
	order := rand.New(rand.NewSource(int64(seed))).Perm(len(texts))
	f := Field{ID: id, Label: label, Points: points, Kind: "choice", Options: []Option{}, Explanation: correct}
	for i, idx := range order {
		key := fmt.Sprintf("%s-option-%d", id, i+1)
		f.Options = append(f.Options, Option{key, texts[idx]})
		if idx == 0 {
			f.Answer = key
		}
	}
	return f
}
func pick(v int, values ...float64) float64 { return values[v%len(values)] }
func PaperFor(task string, v int) (Paper, error) {
	p := Paper{TaskID: task, Title: Titles[task], Variant: v, Parameters: map[string]float64{}, Fields: []Field{}, Reference: []Point{}}
	if p.Title == "" || v < 0 || v >= 64 {
		return p, ErrInvalid
	}
	add := func(f Field) { p.Fields = append(p.Fields, f) }
	switch task {
	case "L1-1":
		a, b, s, d := pick(v, .75, 1.25, 1.5, 2.5), pick(v, .5, 1.5, 2.5), pick(v/2, -1.5, -.5, .5, 1.5), pick(v, .15, .25, .35)
		p.Parameters = map[string]float64{"A": a, "a": b, "shift": s, "delta": d}
		p.Prompt = fmt.Sprintf("原信号 f(t) 的支撑为 [0,3] s，峰值位于 (1 s,1)。变换后 y(t)=%.3g f(%.3g(t−(%.3g)))。另有面积为 1、宽度 Δ=%.3g s 的矩形窄脉冲。", a, b, s, d)
		p.Reference = []Point{{-.5, 0}, {0, 0}, {1, 1}, {3, 0}, {3.5, 0}}
		add(number("peakTime", "变换后峰值时刻", "s", 4, s+1/b, "原峰值满足 a(t−t₀)=1。"))
		add(number("height", "变换后峰高", "", 3, a, "外部幅度因子乘原峰高。"))
		add(number("width", "变换后支撑宽度", "s", 4, 3/math.Abs(b), "宽度除以时间尺度的绝对值。"))
		add(number("pulseHeight", "窄脉冲高度", "", 4, 1/d, "高度×宽度=面积 1。"))
	case "L1-2":
		d := pick(v, .5, 1.5, 2)
		p.Parameters = map[string]float64{"delay": d}
		p.Prompt = fmt.Sprintf("判断 T[x]=x+1、x²、x(2t)、x(t−1)、积分器 ∫₋∞ᵗx(τ)dτ 的性质。所有输入均为因果信号。反例一：x₁=x₂=u(t)，α=β=1，在 t=%.3g s 比较 x² 系统两路径。反例二：x=u(t)，时移 d=%.3g s，在 t=%.3g s 比较 x(2t) 系统两路径。差值均按左路径−右路径。", d, d, .75*d)
		for i, id := range []string{"affine", "square", "timescale", "delay", "integrator"} {
			linear := i >= 2
			invariant := i != 2
			yes := "是"
			no := "否"
			lc, lo := yes, no
			if !linear {
				lc, lo = no, yes
			}
			ic, io := yes, no
			if !invariant {
				ic, io = no, yes
			}
			add(choice(id+"Linear", []string{"x+1", "x²", "x(2t)", "x(t−1)", "积分器"}[i]+" 是否线性？", 1, lc, []string{lo}, v+i))
			add(choice(id+"Invariant", []string{"x+1", "x²", "x(2t)", "x(t−1)", "积分器"}[i]+" 是否时不变？", 1, ic, []string{io}, v+i+4))
		}
		add(number("nonlinearDifference", "反例一：T[x₁+x₂]−T[x₁]−T[x₂]", "", 2.5, 2, "阶跃接通后：4−1−1=2，非零差否定线性。"))
		add(number("timeDifference", "反例二：T[x(t−d)]−(T[x])(t−d)", "", 2.5, 1, "t=0.75d 时，u(2t−d)=1，u(2t−2d)=0。"))
	case "L1-3":
		a, y, t := pick(v, .5, 1.5, 2), pick(v, 1.5, 2.5, .5), pick(v, .5, 1.5, 2)
		if a == y {
			y += 1
		}
		p.Parameters = map[string]float64{"A": a, "y0": y, "t": t}
		p.Prompt = fmt.Sprintf("y′+y=%.3g u(t)，y(0⁻)=%.3g。求 t=%.3g s 的响应分量。", a, y, t)
		zi, zs := y*math.Exp(-t), a*(1-math.Exp(-t))
		add(number("zeroInput", "零输入响应", "", 5, zi, "yzi=y₀e⁻ᵗ。"))
		add(number("zeroState", "零状态响应", "", 5, zs, "yzs=A(1−e⁻ᵗ)。"))
		add(number("total", "全响应", "", 5, zi+zs, "全响应为零输入与零状态之和。"))
	case "L1-4":
		t, w, t2 := pick(v, .25, .75, 1.25, 1.75), pick(v, .02, .04, .08), pick(v, .41, .44, .65)
		p.Parameters = map[string]float64{"t": t, "width": w, "ecgTime": t2}
		p.Prompt = fmt.Sprintf("r(t)=u(t)−u(t−1)，求 (r*r)(%.3g)。再对给定合成心电 x(t) 使用因果滑动平均窗 W=%.3g s，求 t=%.3g s 的平均输出及线性相位延迟 W/2。心电每秒一搏，由下方公式给出；可使用独立计算器或数值积分。", t, w, t2)
		p.Formula = "x(t)=0.02 sin(2π·5t)+0.2 sin(2π·50t)+ΣₙΣᵢ aᵢ exp[−(t−n−cᵢ)²/(2σᵢ²)]，t≥0；t<0 为0。n=floor(t)−1,…,floor(t)+1；(a,c,σ)=(.12,.2,.04),(−.15,.37,.012),(1,.4,.012),(−.25,.43,.012),(.3,.65,.07)。"
		add(number("integral", "矩形卷积值", "", 4, math.Max(0, math.Min(1, t)-math.Max(0, t-1)), "单位矩形卷积值等于重叠长度。"))
		add(number("start", "矩形卷积支撑起点", "s", 1, 0, "两个起点相加。"))
		add(number("end", "矩形卷积支撑终点", "s", 2, 2, "两个终点相加。"))
		add(number("average", "心电滑动平均输出", "", 5, MovingAverage(t2, w), "计算 (1/W)∫₀ᵂx(t−τ)dτ。"))
		add(number("delay", "平均窗线性相位延迟", "s", 3, w/2, "W/2 不是任意波形峰值的严格位移。"))
	case "L2-1":
		k, f := pick(v, 5, 9, 11, 13), pick(v, 5, 8, 12)
		harmonic := 3.
		p.Parameters = map[string]float64{"K": k, "f0": f, "k": harmonic}
		p.Prompt = fmt.Sprintf("幅度 ±1、基频 %.3g Hz 的方波，叠加至最大奇次谐波 K=%.0f。求下列量，指定谐波序号 k=3。", f, k)
		count := integer("count", "实际正弦项数", 4, (k+1)/2)
		count.Explanation = "只取 1、3、…、K 这些正奇数，共 (K+1)/2 项。"
		add(count)
		add(number("highest", "最高频率", "Hz", 4, k*f, "最高频率为 Kf₀。"))
		add(number("amplitude", "k=3 的单边正弦幅度", "", 4, 4/(math.Pi*harmonic), "奇次正弦幅度为 4/(πk)。"))
		add(number("period", "基波周期", "s", 3, 1/f, "T₀=1/f₀。"))
	case "L2-2":
		a, t, s := pick(v, .5, 1.5, 2), pick(v, .75, 1.25, 1.5), pick(v, .25, .5, .75)
		fq := 1 / (4 * t)
		p.Parameters = map[string]float64{"A": a, "T": t, "center": s, "fq": fq}
		p.Prompt = fmt.Sprintf("x(t)=A[u(t−t₀+T/2)−u(t−t₀−T/2)]，A=%.3g，T=%.3g s，t₀=%.3g s。傅里叶变换使用 Hz，指定 fq=1/(4T)=%.6g Hz。", a, t, s, fq)
		p.Reference = []Point{{s - t, 0}, {s - t/2, 0}, {s - t/2, a}, {s + t/2, a}, {s + t/2, 0}, {s + t, 0}}
		add(number("dc", "零频幅度 X(0)", "", 4, a*t, "X(0)=AT。"))
		add(number("zero", "第一正零点", "Hz", 4, 1/t, "f₁=1/T。"))
		add(number("mainWidth", "主瓣两零点间宽度", "Hz", 3, 2/t, "Δf=2/T。"))
		f := number("phase", "fq 处相位", "rad", 4, -2*math.Pi*fq*s, "此频点 sinc 为正，相位为 −2πfqt₀，按模 2π 比较。")
		f.Kind = "phase"
		add(f)
	case "L2-3":
		keep, noise := pick(v, 8, 10, 12), pick(v, 48, 50, 52)
		p.Parameters = map[string]float64{"keep": keep, "noise": noise}
		p.Prompt = fmt.Sprintf("保留 %.0f Hz：R≥0.95；抑制 %.0f Hz：R≤0.05。使用 H(s)=(s²+ω₀²)/((s+α)²+ω₀²)，ω₀=2πf₀。选择最低阶、中心频率及 0<α≤80 s⁻¹，并按你填写的 f₀、α 计算两个幅度比。", keep, noise)
		order := integer("order", "最低阶数", 3, 2)
		order.Explanation = "实系数系统在非零频率陷波需要一对共轭零点 ±jω₀，最低阶为二阶。"
		add(order)
		add(number("center", "陷波中心 f₀", "Hz", 3, noise, "零点对准干扰频率。"))
		f := number("alpha", "满足双指标的 α", "s⁻¹", 4, 10, "α>0，并按未舍入的幅度比核对两个不等式。")
		f.Kind = "alpha"
		add(f)
		for _, spec := range []struct {
			id, label string
			freq      float64
		}{{"keepRatio", "保留频率幅度比", keep}, {"noiseRatio", "干扰频率幅度比", noise}} {
			f := number(spec.id, spec.label, "", 2.5, Notch(noise, 10, spec.freq), "按所选中心与 α 的传递函数计算复数模。")
			f.Kind = "ratio"
			add(f)
		}
	case "L2-4":
		f := pick(v, 8, 12, 14)
		fs := 1.5 * f
		fc := f / 5
		n := 2.
		p.Parameters = map[string]float64{"f0": f, "fs": fs, "fc": fc, "n": n}
		p.Prompt = fmt.Sprintf("单位幅度 %.0f Hz 余弦，以 %.0f Hz 采样。加入二阶 Butterworth 低通，fc=%.3g Hz；幅度响应 1/√(1+(f/fc)⁴)。求阈值、混叠频率与滤波后混叠幅度。", f, fs, fc)
		add(number("nyquist", "奈奎斯特速率阈值 2f₀", "Hz", 3, 2*f, "通用安全采样要求 fs>2fmax。"))
		add(number("alias", "折叠到 [0,fs/2] 的频率", "Hz", 4, Alias(f, fs), "对采样率取余后折叠。"))
		add(number("amplitude", "滤波后混叠幅度", "", 4, 1/math.Sqrt(1+math.Pow(f/fc, 2*n)), "固定增益，幅度不归一化。"))
		add(choice("position", "抗混叠滤波器应放在哪里？", 2, "采样之前", []string{"采样之后", "前后等效"}, v))
		add(choice("attenuation", "滤波对已超过奈奎斯特频率的分量有何作用？", 2, "采样前衰减它，以降低混叠幅度", []string{"采样后自动恢复原频率", "改变采样率"}, v+1))
	case "L3-1":
		a, s, t := pick(v, .5, 1.5, 2.5), pick(v, .5, 1.5, 2), pick(v, .5, 1.5, 2.5)
		p.Parameters = map[string]float64{"A": a, "start": s, "T": t}
		p.Prompt = fmt.Sprintf("矩形信号幅度 %.3g，从 t=%.3g s 开始，持续 %.3g s。填写 X(s)=c(e^(−d₁s)−e^(−d₂s))/(s+b) 的四个系数。", a, s, t)
		p.Reference = []Point{{0, 0}, {s, 0}, {s, a}, {s + t, a}, {s + t, 0}, {s + t + .5, 0}}
		add(number("c", "分子系数 c", "", 3, a, "c 等于幅度。"))
		add(number("b", "分母系数 b", "", 3, 0, "矩形由阶跃之差构成，分母为 s。"))
		add(number("d1", "开始时刻 d₁", "s", 4, s, "第一个时移为开始时刻。"))
		add(number("d2", "结束时刻 d₂", "s", 5, s+t, "结束时刻=开始时刻+持续时间。"))
	case "L3-2":
		a, b, y := pick(v, .5, 1.5, 2), pick(v, 1.5, 2, .5), pick(v, .25, 1.25, 2.5)
		c, d := b/a, y-b/a
		p.Parameters = map[string]float64{"a": a, "A": b, "y0": y}
		p.Prompt = fmt.Sprintf("y′+%.3g y=%.3g u(t)，y(0⁻)=%.3g。使用 (s+a)Y=A/s+b₀、y(t)=C+D exp(−at)。t90 始终指同一系统零初始状态响应到达终值 90%% 的时间。", a, b, y)
		for _, f := range []Field{number("b0", "初始项 b₀", "", 3, y, "b₀=y₀。"), number("C", "常数 C", "", 3, c, "C=A/a。"), number("D", "系数 D", "", 3, d, "D=y₀−A/a。"), number("y1", "y(1)", "", 3, c+d*math.Exp(-a), "把 t=1 代入解析响应。"), number("t90", "零状态 t90", "s", 3, math.Log(10)/a, "t90=ln(10)/a。")} {
			add(f)
		}
	case "L3-3":
		f, a := pick(v, 45, 50, 55), pick(v, 5, 10, 60)
		w := 2 * math.Pi * f
		p.Parameters = map[string]float64{"center": f, "alpha": a}
		p.Prompt = fmt.Sprintf("因果系统 H(s)=(s²+ω₀²)/((s+α)²+ω₀²)，f₀=%.0f Hz，ω₀=2πf₀，α=%.0f s⁻¹。虚部按 rad/s 填写。", f, a)
		add(number("zeroImag", "零点正虚部", "rad/s", 3, w, "零点为 ±jω₀。"))
		add(number("poleReal", "极点实部", "s⁻¹", 3, -a, "极点为 −α±jω₀。"))
		add(number("poleImag", "极点正虚部", "rad/s", 3, w, "Hz 需乘 2π。"))
		add(number("roc", "因果 ROC：Re(s)> 的边界", "s⁻¹", 3, -a, "ROC 在最右极点右侧。"))
		add(choice("stable", "该因果系统是否输入输出稳定？", 3, "稳定", []string{"不稳定"}, v))
	case "L3-4":
		rho := pick(v, .65, .7, .75, .85)
		lower := -math.Log(1 - rho)
		grid := math.Ceil(lower*100) / 100
		p.Parameters = map[string]float64{"rho": rho}
		p.Prompt = fmt.Sprintf("y′+y=u(t)−u(t−T)，零初值。要求峰值≥%.2f，脉宽只能按 0.01 s 调节。求连续理论下界与最短可选方案。", rho)
		add(number("lower", "连续理论下界", "s", 4, lower, "T*=−ln(1−ρ)。"))
		f := number("grid", "最短可选脉宽", "s", 4, grid, "向上取到 0.01 s 格点；相邻更短格点必须不达标。")
		f.Tolerance = 1e-9
		add(f)
		add(number("peak", "该最短方案的峰值", "", 4, 1-math.Exp(-grid), "峰值为 1−e⁻ᵀ，先用未舍入值核对达标。"))
		add(choice("previous", "相邻更短 0.01 s 的方案是否达标？", 3, "不达标", []string{"达标"}, v))
	}
	for i, c := range Concepts[task] {
		q := c[v%2]
		field := choice(fmt.Sprintf("C%d", i+1), q.Prompt, float64(i+2), q.Correct, q.Others, v*17+i+9)
		field.Explanation = q.Explanation
		add(field)
	}
	return p, nil
}
