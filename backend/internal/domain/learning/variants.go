package learning

// Variant is a server-owned follow-up question for one of the quick-practice
// concepts. The client sends only the identifier; correctness never comes from
// the browser.
type Variant struct {
	ID             string
	BaseQuestionID string
	Answer         int
	ZH             VariantText
	EN             VariantText
}

type VariantText struct {
	Prompt      string
	Options     []string
	Explanation string
}

// Variants returns two deterministic follow-up variants per catalog question.
// Keeping variant IDs stable lets review requests remain idempotent.
func Variants() []Variant {
	return []Variant{
		{ID: "energy-signal-v1", BaseQuestionID: "energy-signal", Answer: 0, ZH: VariantText{Prompt: "x(t)=2e^(−t)u(t) 的总能量是多少？", Options: []string{"2", "4", "∞", "0"}, Explanation: "E=∫₀∞4e^(−2t)dt=2。"}, EN: VariantText{Prompt: "What is the total energy of x(t)=2e^(−t)u(t)?", Options: []string{"2", "4", "∞", "0"}, Explanation: "E=∫₀∞4e^(−2t)dt=2."}},
		{ID: "energy-signal-v2", BaseQuestionID: "energy-signal", Answer: 1, ZH: VariantText{Prompt: "x(t)=3cos(2πt) 的平均功率是多少？", Options: []string{"3", "4.5", "9", "∞"}, Explanation: "余弦的均方值为幅度平方的一半：P=9/2。"}, EN: VariantText{Prompt: "What is the average power of x(t)=3cos(2πt)?", Options: []string{"3", "4.5", "9", "∞"}, Explanation: "A cosine has mean square A²/2, so P=9/2."}},
		{ID: "convolution-shift-v1", BaseQuestionID: "convolution-shift", Answer: 0, ZH: VariantText{Prompt: "已知 y(t)=x(t)∗h(t)，x(t−2)∗h(t) 等于什么？", Options: []string{"y(t−2)", "y(t+2)", "2y(t)", "y(2t)"}, Explanation: "输入延迟 2，卷积输出同样延迟 2。"}, EN: VariantText{Prompt: "Given y(t)=x(t)∗h(t), what is x(t−2)∗h(t)?", Options: []string{"y(t−2)", "y(t+2)", "2y(t)", "y(2t)"}, Explanation: "Delaying one input by 2 delays the convolution output by 2."}},
		{ID: "convolution-shift-v2", BaseQuestionID: "convolution-shift", Answer: 2, ZH: VariantText{Prompt: "x(t−1)∗h(t−2) 相对于 y(t)=x(t)∗h(t) 如何变化？", Options: []string{"y(t−1)", "y(t+3)", "y(t−3)", "y(3t)"}, Explanation: "卷积的两个输入延迟相加：1+2=3。"}, EN: VariantText{Prompt: "How does x(t−1)∗h(t−2) relate to y(t)=x(t)∗h(t)?", Options: []string{"y(t−1)", "y(t+3)", "y(t−3)", "y(3t)"}, Explanation: "The two delays add under convolution: 1+2=3."}},
		{ID: "step-response-v1", BaseQuestionID: "step-response", Answer: 2, ZH: VariantText{Prompt: "一阶系统在 t=3τ 时达到终值的约多少？", Options: []string{"50%", "63.2%", "95.0%", "100%"}, Explanation: "归一化响应 1−e^(−3)≈0.9502。"}, EN: VariantText{Prompt: "At t=3τ, approximately what fraction of the final first-order step response is reached?", Options: []string{"50%", "63.2%", "95.0%", "100%"}, Explanation: "The normalized response is 1−e^(−3)≈0.9502."}},
		{ID: "step-response-v2", BaseQuestionID: "step-response", Answer: 3, ZH: VariantText{Prompt: "一阶系统在 t=5τ 时达到终值的约多少？", Options: []string{"63.2%", "86.5%", "95.0%", "99.3%"}, Explanation: "1−e^(−5)≈0.9933，有限时刻仍未精确到达终值。"}, EN: VariantText{Prompt: "At t=5τ, approximately how much of the final value is reached?", Options: []string{"63.2%", "86.5%", "95.0%", "99.3%"}, Explanation: "1−e^(−5)≈0.9933; the exact final value is approached asymptotically."}},
		{ID: "aliasing-v1", BaseQuestionID: "aliasing", Answer: 3, ZH: VariantText{Prompt: "900 Hz 正弦信号以 1000 Hz 采样，折叠到 [0,500] Hz 后的频率是多少？", Options: []string{"900 Hz", "1000 Hz", "1900 Hz", "100 Hz"}, Explanation: "|900−1000|=100 Hz，位于奈奎斯特区间。"}, EN: VariantText{Prompt: "A 900 Hz sinusoid is sampled at 1000 Hz. What frequency appears in [0,500] Hz?", Options: []string{"900 Hz", "1000 Hz", "1900 Hz", "100 Hz"}, Explanation: "|900−1000|=100 Hz lies in the Nyquist interval."}},
		{ID: "aliasing-v2", BaseQuestionID: "aliasing", Answer: 3, ZH: VariantText{Prompt: "700 Hz 正弦信号以 800 Hz 采样，折叠到 [0,400] Hz 后的频率是多少？", Options: []string{"700 Hz", "800 Hz", "1500 Hz", "100 Hz"}, Explanation: "|700−800|=100 Hz；混叠频率需落在第一奈奎斯特区间。"}, EN: VariantText{Prompt: "A 700 Hz sinusoid is sampled at 800 Hz. What frequency appears in [0,400] Hz?", Options: []string{"700 Hz", "800 Hz", "1500 Hz", "100 Hz"}, Explanation: "|700−800|=100 Hz is in the first Nyquist interval."}},
		{ID: "nyquist-v1", BaseQuestionID: "nyquist", Answer: 1, ZH: VariantText{Prompt: "最高频率 300 Hz，要求 fs>2fmax，哪个采样率满足要求？", Options: []string{"300 Hz", "800 Hz", "600 Hz", "150 Hz"}, Explanation: "需严格大于 600 Hz，因此选择 800 Hz。"}, EN: VariantText{Prompt: "For fmax=300 Hz and the requirement fs>2fmax, which sampling rate works?", Options: []string{"300 Hz", "800 Hz", "600 Hz", "150 Hz"}, Explanation: "The rate must be strictly above 600 Hz, so choose 800 Hz."}},
		{ID: "nyquist-v2", BaseQuestionID: "nyquist", Answer: 2, ZH: VariantText{Prompt: "最高频率 400 Hz，要求 fs>2fmax，哪个采样率满足要求？", Options: []string{"400 Hz", "800 Hz", "1000 Hz", "200 Hz"}, Explanation: "需严格大于 800 Hz；等号不能满足本题约定。"}, EN: VariantText{Prompt: "For fmax=400 Hz and fs>2fmax, which sampling rate works?", Options: []string{"400 Hz", "800 Hz", "1000 Hz", "200 Hz"}, Explanation: "The rate must be strictly above 800 Hz under the stated condition."}},
		{ID: "square-wave-v1", BaseQuestionID: "square-wave", Answer: 0, ZH: VariantText{Prompt: "零均值、50% 占空比的双极性方波包含哪些谐波？", Options: []string{"奇次谐波", "仅偶次谐波", "仅直流", "所有谐波幅度相同"}, Explanation: "半波反对称使偶次谐波和直流项为零。"}, EN: VariantText{Prompt: "Which harmonics occur in a zero-mean bipolar square wave with 50% duty cycle?", Options: []string{"Odd harmonics", "Even harmonics only", "DC only", "All harmonics with equal amplitude"}, Explanation: "Half-wave antisymmetry eliminates DC and even harmonics."}},
		{ID: "square-wave-v2", BaseQuestionID: "square-wave", Answer: 1, ZH: VariantText{Prompt: "理想双极性方波的第三次谐波幅度是基波的多少？", Options: []string{"3", "1/3", "1/2", "1"}, Explanation: "奇次谐波幅度按 1/n 衰减，所以 A₃/A₁=1/3。"}, EN: VariantText{Prompt: "What is the third-harmonic amplitude relative to the fundamental for an ideal bipolar square wave?", Options: []string{"3", "1/3", "1/2", "1"}, Explanation: "Odd-harmonic amplitudes scale as 1/n, so A₃/A₁=1/3."}},
		{ID: "pulse-spectrum-v1", BaseQuestionID: "pulse-spectrum", Answer: 2, ZH: VariantText{Prompt: "矩形脉宽减半，频谱第一个正零点如何变化？", Options: []string{"减半", "不变", "变为两倍", "变为四倍"}, Explanation: "第一个正零点 f₀=1/T，与脉宽成反比。"}, EN: VariantText{Prompt: "If a rectangular pulse width is halved, how does the first positive spectral zero change?", Options: []string{"Halved", "Unchanged", "Doubled", "Quadrupled"}, Explanation: "The first positive zero f₀=1/T is inversely proportional to pulse width."}},
		{ID: "pulse-spectrum-v2", BaseQuestionID: "pulse-spectrum", Answer: 3, ZH: VariantText{Prompt: "幅度 A=2、宽度 T=3 的矩形脉冲，其 X(0) 是多少？", Options: []string{"2", "3", "5", "6"}, Explanation: "直流值等于时域积分，即脉冲面积 AT=6。"}, EN: VariantText{Prompt: "For a rectangular pulse with A=2 and T=3, what is X(0)?", Options: []string{"2", "3", "5", "6"}, Explanation: "The DC value is the time integral, or pulse area AT=6."}},
		{ID: "time-constant-v1", BaseQuestionID: "time-constant", Answer: 0, ZH: VariantText{Prompt: "保持增益不变，时间常数加倍，一阶响应会怎样？", Options: []string{"达到相同比例所需时间加倍", "响应加快两倍", "终值加倍", "产生超调"}, Explanation: "t=−τ ln(1−r)，达到固定比例 r 的时间与 τ 成正比。"}, EN: VariantText{Prompt: "With fixed gain, what happens when a first-order time constant doubles?", Options: []string{"Time to the same fraction doubles", "Response is twice as fast", "Final value doubles", "Overshoot appears"}, Explanation: "For a fixed fraction r, t=−τ ln(1−r) is proportional to τ."}},
		{ID: "time-constant-v2", BaseQuestionID: "time-constant", Answer: 1, ZH: VariantText{Prompt: "系统 H(s)=1/(s+4) 的时间常数是多少？", Options: []string{"4 s", "0.25 s", "1 s", "2 s"}, Explanation: "极点为 −1/τ=−4，所以 τ=1/4 s。"}, EN: VariantText{Prompt: "What is the time constant of H(s)=1/(s+4)?", Options: []string{"4 s", "0.25 s", "1 s", "2 s"}, Explanation: "The pole is −1/τ=−4, so τ=1/4 s."}},
		{ID: "damping-v1", BaseQuestionID: "damping", Answer: 0, ZH: VariantText{Prompt: "标准二阶系统 ζ 从 0.2 增大到 0.7，超调量如何变化？", Options: []string{"减小", "增大", "不变", "变为无穷"}, Explanation: "欠阻尼超调量 Mp=e^(−πζ/√(1−ζ²)) 随 ζ 增大而减小。"}, EN: VariantText{Prompt: "For a standard second-order system, what happens to overshoot as ζ rises from 0.2 to 0.7?", Options: []string{"Decreases", "Increases", "Unchanged", "Becomes infinite"}, Explanation: "For 0<ζ<1, Mp=e^(−πζ/√(1−ζ²)) decreases as ζ increases."}},
		{ID: "damping-v2", BaseQuestionID: "damping", Answer: 3, ZH: VariantText{Prompt: "标准二阶系统 ζ=1 属于哪种阻尼？", Options: []string{"无阻尼", "欠阻尼", "过阻尼", "临界阻尼"}, Explanation: "ζ=1 对应重实极点，是欠阻尼与过阻尼的分界。"}, EN: VariantText{Prompt: "What damping regime corresponds to ζ=1 in a standard second-order system?", Options: []string{"Undamped", "Underdamped", "Overdamped", "Critically damped"}, Explanation: "ζ=1 gives repeated real poles at the boundary between underdamping and overdamping."}},
		{ID: "right-half-plane-v1", BaseQuestionID: "right-half-plane", Answer: 3, ZH: VariantText{Prompt: "因果系统有极点 s=+2，该极点对应的自然响应怎样变化？", Options: []string{"衰减", "恒定", "瞬间消失", "指数增长"}, Explanation: "该极点产生 e^(2t) 项，随时间增长。"}, EN: VariantText{Prompt: "A causal system has a pole at s=+2. How does its corresponding natural response behave?", Options: []string{"Decays", "Is constant", "Vanishes immediately", "Grows exponentially"}, Explanation: "The pole contributes e^(2t), which grows over time."}},
		{ID: "right-half-plane-v2", BaseQuestionID: "right-half-plane", Answer: 0, ZH: VariantText{Prompt: "因果系统 H(s)=1/(s+3)，其 BIBO 稳定性如何？", Options: []string{"稳定", "不稳定", "临界稳定", "仅凭该信息无法判断"}, Explanation: "因果 ROC 为 Re(s)>−3，包含虚轴；冲激响应绝对可积。"}, EN: VariantText{Prompt: "Is the causal system H(s)=1/(s+3) BIBO stable?", Options: []string{"Stable", "Unstable", "Marginally stable", "Cannot be determined"}, Explanation: "Its causal ROC Re(s)>−3 includes the imaginary axis, and its impulse response is absolutely integrable."}},
		{ID: "am-bandwidth-v1", BaseQuestionID: "am-bandwidth", Answer: 2, ZH: VariantText{Prompt: "单音双边带 AM 的调制频率为 4 kHz，带宽是多少？", Options: []string{"4 kHz", "16 kHz", "8 kHz", "2 kHz"}, Explanation: "上下边带位于 fc±fm，总带宽为 2fm=8 kHz。"}, EN: VariantText{Prompt: "For single-tone double-sideband AM with fm=4 kHz, what is the bandwidth?", Options: []string{"4 kHz", "16 kHz", "8 kHz", "2 kHz"}, Explanation: "Sidebands at fc±fm span 2fm=8 kHz."}},
		{ID: "am-bandwidth-v2", BaseQuestionID: "am-bandwidth", Answer: 3, ZH: VariantText{Prompt: "载频 100 kHz、调制频率 3 kHz 的双边带 AM，占据的频率范围是什么？", Options: []string{"100–103 kHz", "94–106 kHz", "98.5–101.5 kHz", "97–103 kHz"}, Explanation: "边带位于 100±3 kHz，即 97 和 103 kHz。"}, EN: VariantText{Prompt: "For double-sideband AM with fc=100 kHz and fm=3 kHz, what band is occupied?", Options: []string{"100–103 kHz", "94–106 kHz", "98.5–101.5 kHz", "97–103 kHz"}, Explanation: "The sidebands lie at 100±3 kHz: 97 and 103 kHz."}},
		{ID: "imaginary-axis-v1", BaseQuestionID: "imaginary-axis", Answer: 0, ZH: VariantText{Prompt: "简单极点 s=±j3 对应的自然响应特征是什么？", Options: []string{"持续等幅振荡", "指数衰减", "指数增长", "单调趋于零"}, Explanation: "实部为零，没有衰减或增长包络；虚部决定角频率。"}, EN: VariantText{Prompt: "What natural response corresponds to simple poles at s=±j3?", Options: []string{"Sustained constant-amplitude oscillation", "Exponential decay", "Exponential growth", "Monotonic decay to zero"}, Explanation: "The real part is zero, so there is no exponential decay or growth; the imaginary part sets angular frequency."}},
		{ID: "imaginary-axis-v2", BaseQuestionID: "imaginary-axis", Answer: 1, ZH: VariantText{Prompt: "因果系统 H(s)=1/(s²+9) 是否 BIBO 稳定？", Options: []string{"稳定", "不稳定", "只要输入有界就稳定", "与 ROC 无关"}, Explanation: "因果 ROC 为 Re(s)>0，不包含虚轴；持续振荡的冲激响应不绝对可积。"}, EN: VariantText{Prompt: "Is the causal system H(s)=1/(s²+9) BIBO stable?", Options: []string{"Stable", "Unstable", "Stable for every bounded input", "Independent of the ROC"}, Explanation: "The causal ROC Re(s)>0 excludes the imaginary axis; its sustained oscillatory impulse response is not absolutely integrable."}},
	}
}

func FindQuestion(id string) *Question {
	for _, question := range Questions() {
		if question.ID == id {
			copy := question
			return &copy
		}
	}
	return nil
}

func FindVariant(id string) *Variant {
	for _, variant := range Variants() {
		if variant.ID == id {
			copy := variant
			return &copy
		}
	}
	return nil
}

func SuggestedVariant(questionID string, reviewStage int) string {
	suffix := "v1"
	if reviewStage%2 == 1 {
		suffix = "v2"
	}
	variantID := questionID + "-" + suffix
	if FindVariant(variantID) == nil {
		return ""
	}
	return variantID
}
