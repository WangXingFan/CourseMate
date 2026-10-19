package learning

import (
	"fmt"
	"sort"
	"strings"
)

type tutorText struct {
	HintSummary    string
	ExplainSummary string
	HintSteps      []string
	ExplainSteps   []string
}

type tutorGuidance struct {
	CitationIDs []string
	ZH          tutorText
	EN          tutorText
}

var curatedGuidance = map[string]tutorGuidance{
	"signal-basics": {
		CitationIDs: []string{"signal-basics", "fourier-transform"},
		ZH: tutorText{
			HintSummary: "先看信号是否在无限长时间上持续存在，再分别检查平方积分与平均功率。不要只凭“看起来一直有值”就分类。",
			HintSteps: []string{
				"从参数和曲线确认信号是有限时宽、周期持续，还是随时间增长。",
				"计算或估计 ∫|x(t)|²dt；只有有限值时才是能量信号。",
				"若平方积分发散，再检查 (1/T)∫|x(t)|²dt 是否趋于有限正值。",
			},
			ExplainSummary: "能量信号要求总能量有限；功率信号在无限时间上具有有限非零平均功率。周期信号通常是功率信号，增长信号通常两者都不是。",
			ExplainSteps: []string{
				"定位决定积分收敛性的项：指数衰减会收敛，常数或周期项不会。",
				"把“总能量”与“平均功率”分别对应到两个极限，不要混用。",
				"用当前曲线检查：有限时宽看总能量，持续等幅看平均功率。",
			},
		},
		EN: tutorText{
			HintSummary: "First ask whether the signal persists over all time, then check the squared integral and the average power separately. Do not classify from appearance alone.",
			HintSteps: []string{
				"Use the parameters and plot to decide whether the signal has finite duration, persists periodically, or grows.",
				"Estimate ∫|x(t)|²dt; it must be finite for an energy signal.",
				"If the squared integral diverges, check whether (1/T)∫|x(t)|²dt approaches a finite positive value.",
			},
			ExplainSummary: "An energy signal has finite total energy. A power signal has finite, nonzero average power over infinite time. Periodic signals are usually power signals, while growing signals are usually neither.",
			ExplainSteps: []string{
				"Identify the term controlling convergence: exponential decay converges, while constant or periodic terms do not.",
				"Keep total energy and average power as two distinct limits.",
				"Use the plot: finite-duration signals are evaluated by total energy; persistent equal-amplitude signals by average power.",
			},
		},
	},
	"time-domain": {
		CitationIDs: []string{"first-order", "laplace"},
		ZH: tutorText{
			HintSummary: "把当前题看成 y(t)=K(1−e^(−t/τ))。关键是先求 k=t/τ，再代入指数，而不是凭曲线高度猜答案。",
			HintSteps: []string{
				"从参数中找出增益 K、时间常数 τ 和当前倍数 k。",
				"令 t=kτ，因此 t/τ=k。",
				"计算 1−e^(−k)，再与 63%、86%、95%、99% 这些常用基准比较。",
			},
			ExplainSummary: "一阶阶跃响应按指数逼近终值。一个 τ 达到约 63.2%，三个 τ 约 95%，五个 τ 已接近终值。",
			ExplainSteps: []string{
				"先确认终值是 K，而不是曲线在某一时刻的瞬时值。",
				"把 kτ 代入归一化响应 1−e^(−k)，增益只做纵向缩放。",
				"若要判断调节时间，可用 5τ 的工程近似，但它不是突然完全到达终值。",
			},
		},
		EN: tutorText{
			HintSummary: "Read this as y(t)=K(1−e^(−t/τ)). Compute k=t/τ first, then evaluate the exponential instead of estimating height from the curve.",
			HintSteps: []string{
				"Identify gain K, time constant τ, and the current multiple k.",
				"Set t=kτ, so t/τ=k.",
				"Evaluate 1−e^(−k) and compare with the reference values 63%, 86%, 95%, and 99%.",
			},
			ExplainSummary: "A first-order step response approaches its final value exponentially. One τ reaches about 63.2%, three τ about 95%, and five τ is effectively settled.",
			ExplainSteps: []string{
				"Confirm that the final value is K, not the instantaneous value at one time.",
				"Substitute kτ into the normalized response 1−e^(−k); gain only scales it vertically.",
				"For settling time, 5τ is an engineering approximation, not an instant jump to the final value.",
			},
		},
	},
	"frequency-domain": {
		CitationIDs: []string{"fourier-transform", "signal-basics"},
		ZH: tutorText{
			HintSummary: "矩形脉冲的频谱是 sinc。先算脉冲面积 Aτ 得到 X(0)，再用零点 f=k/τ 判断主瓣宽度。",
			HintSteps: []string{
				"从参数读取幅度 A 与宽度 τ，先计算面积 Aτ。",
				"将第一个零点放在 f=1/τ；脉宽越小，零点越远。",
				"若题目问直流值，取 X(0)=Aτ；若问主瓣，则关注零点间距。",
			},
			ExplainSummary: "时域矩形脉冲与频域 sinc 成变换对：幅度缩放频谱高度，脉宽缩窄会让频域主瓣变宽。",
			ExplainSteps: []string{
				"直流分量等于脉冲面积，而不是单独的幅度或宽度。",
				"零点由 τ 决定：f=k/τ，因此时宽与频宽方向相反。",
				"频谱旁瓣可以出现负值，但图示的幅值 |X(f)| 保持非负。",
			},
		},
		EN: tutorText{
			HintSummary: "A rectangular pulse has a sinc spectrum. Compute area Aτ for X(0), then use the zeros f=k/τ to reason about main-lobe width.",
			HintSteps: []string{
				"Read amplitude A and width τ, then compute area Aτ.",
				"Place the first zero at f=1/τ; a narrower pulse moves it farther out.",
				"For a DC question, use X(0)=Aτ; for main-lobe width, focus on the zero spacing.",
			},
			ExplainSummary: "The time-domain rectangle and frequency-domain sinc form a transform pair: amplitude scales spectral height, while narrowing the pulse widens the main lobe.",
			ExplainSteps: []string{
				"DC amplitude is the pulse area, not amplitude or width alone.",
				"Zeros satisfy f=k/τ, so time width and frequency width move in opposite directions.",
				"Sinc lobes alternate sign, although the plotted magnitude |X(f)| stays nonnegative.",
			},
		},
	},
	"s-domain": {
		CitationIDs: []string{"laplace", "second-order"},
		ZH: tutorText{
			HintSummary: "先读极点实部 σ 判断包络，再读虚部 ω 判断振荡。最后用因果系统的 ROC（最右极点右侧）判断稳定性。",
			HintSteps: []string{
				"把极点写成 σ±jω：σ 控制 e^(σt)，ω 控制振荡快慢。",
				"σ<0 时包络衰减，σ=0 时等幅，σ>0 时增长。",
				"因果系统的 ROC 为 Re(s)>最右极点实部；只有 ROC 包含虚轴才稳定。",
			},
			ExplainSummary: "左半平面极点给衰减项，虚轴极点给等幅振荡，右半平面极点给增长项；ROC 把极点位置与稳定性联系起来。",
			ExplainSteps: []string{
				"重根、共轭对或单实极点会改变响应形状，但实部正负仍决定长期增长或衰减。",
				"边界情形 σ=0 不是 BIBO 稳定；它对应持续振荡。",
				"稳定判断必须同时说明因果性/ROC，不能只看极点图。",
			},
		},
		EN: tutorText{
			HintSummary: "Read pole real part σ for the envelope and imaginary part ω for oscillation. Then use the causal ROC, right of the rightmost pole, for stability.",
			HintSteps: []string{
				"Write poles as σ±jω: σ controls e^(σt), while ω controls oscillation rate.",
				"For σ<0 the envelope decays; σ=0 keeps constant amplitude; σ>0 grows.",
				"A causal ROC is Re(s)>rightmost pole real part. It must include the imaginary axis for BIBO stability.",
			},
			ExplainSummary: "Left-half-plane poles produce decaying terms, imaginary-axis poles produce sustained oscillation, and right-half-plane poles produce growth. The ROC connects pole locations to stability.",
			ExplainSteps: []string{
				"Repeated, conjugate, or single real poles change the response shape, but the sign of the real part controls long-term growth or decay.",
				"The boundary case σ=0 is not BIBO stable; it produces a sustained oscillation.",
				"A stability conclusion should state causality/ROC assumptions, not rely on the pole plot alone.",
			},
		},
	},
}

type localizedTutorCitation struct {
	ChapterZH string
	SectionZH string
	ChapterEN string
	SectionEN string
	Href      string
}

var tutorCitations = map[string]localizedTutorCitation{
	"signal-basics":     {ChapterZH: "第一章", SectionZH: "信号的分类与基本运算", ChapterEN: "Chapter 1", SectionEN: "Signal classification and operations", Href: "/learn/experiments/signal-basics"},
	"convolution":       {ChapterZH: "第二章", SectionZH: "卷积与 LTI 系统", ChapterEN: "Chapter 2", SectionEN: "Convolution and LTI systems", Href: "/learn/convolution"},
	"first-order":       {ChapterZH: "第二章", SectionZH: "一阶系统与时间常数", ChapterEN: "Chapter 2", SectionEN: "First-order systems and time constants", Href: "/learn/first-order"},
	"sampling":          {ChapterZH: "第三章", SectionZH: "采样定理与混叠", ChapterEN: "Chapter 3", SectionEN: "Sampling theorem and aliasing", Href: "/learn/sampling"},
	"fourier-series":    {ChapterZH: "第三章", SectionZH: "周期信号的傅里叶级数", ChapterEN: "Chapter 3", SectionEN: "Fourier series of periodic signals", Href: "/learn/fourier-series"},
	"fourier-transform": {ChapterZH: "第三章", SectionZH: "傅里叶变换与频谱", ChapterEN: "Chapter 3", SectionEN: "Fourier transform and spectra", Href: "/learn/fourier-transform"},
	"second-order":      {ChapterZH: "第四章", SectionZH: "二阶系统与阻尼", ChapterEN: "Chapter 4", SectionEN: "Second-order systems and damping", Href: "/learn/second-order"},
	"laplace":           {ChapterZH: "第四章", SectionZH: "拉普拉斯变换、极点与 ROC", ChapterEN: "Chapter 4", SectionEN: "Laplace transform, poles, and ROC", Href: "/learn/laplace"},
	"modulation":        {ChapterZH: "第五章", SectionZH: "调制与频谱搬移", ChapterEN: "Chapter 5", SectionEN: "Modulation and spectral shifting", Href: "/learn/modulation"},
}

func curatedTutorResponse(input TutorInput) TutorResponse {
	guidance := curatedGuidance[input.ExperimentID]
	text := guidance.EN
	if input.Locale == "zh" {
		text = guidance.ZH
	}
	summary := text.HintSummary
	steps := text.HintSteps
	if input.Action == "explain" {
		summary = text.ExplainSummary
		steps = text.ExplainSteps
	}
	summary = appendTutorContext(summary, input)
	citations := make([]TutorCitation, 0, len(guidance.CitationIDs))
	for _, id := range guidance.CitationIDs {
		if citation, ok := localizedCitation(id, input.Locale); ok {
			citations = append(citations, citation)
		}
	}
	return TutorResponse{Source: "curated", Summary: summary, Steps: append([]string(nil), steps...), Citations: citations}
}

func appendTutorContext(summary string, input TutorInput) string {
	parts := make([]string, 0, len(input.Parameters))
	keys := make([]string, 0, len(input.Parameters))
	for key := range input.Parameters {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	for _, key := range keys {
		parts = append(parts, fmt.Sprintf("%s=%s", key, input.Parameters[key]))
	}
	if len(parts) > 0 {
		if input.Locale == "zh" {
			summary += " 当前设置：" + strings.Join(parts, "，") + "。"
		} else {
			summary += " Current setup: " + strings.Join(parts, ", ") + "."
		}
	}
	if input.PlotSummary != "" {
		if input.Locale == "zh" {
			summary += " 图形观察：" + input.PlotSummary
		} else {
			summary += " Plot observation: " + input.PlotSummary
		}
	}
	return boundedText(summary, 1_900)
}

func localizedCitation(id string, locale string) (TutorCitation, bool) {
	item, ok := tutorCitations[id]
	if !ok {
		return TutorCitation{}, false
	}
	if locale == "zh" {
		return TutorCitation{ID: id, Chapter: item.ChapterZH, Section: item.SectionZH, Href: item.Href}, true
	}
	return TutorCitation{ID: id, Chapter: item.ChapterEN, Section: item.SectionEN, Href: item.Href}, true
}

func allowedCitationIDs(experimentID string) map[string]struct{} {
	result := map[string]struct{}{}
	for _, id := range curatedGuidance[experimentID].CitationIDs {
		result[id] = struct{}{}
	}
	return result
}
