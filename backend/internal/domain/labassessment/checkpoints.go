package labassessment

import "math"

// Each checkpoint freezes the required parameter settings and re-computes
// measured values on the server. No client score, passed flag or imported
// completion marker is accepted as credit.
func Checkpoints(task string) []Checkpoint {
	result := []Checkpoint{}
	point := func(prompt string, fields ...Field) {
		maximum := 2.
		if len(result) == 1 {
			maximum = 3
		}
		for i := range fields {
			fields[i].Points = maximum / float64(len(fields))
			if fields[i].Kind == "number" && fields[i].Tolerance == 0 {
				fields[i].Tolerance = .03
			}
		}
		result = append(result, Checkpoint{Maximum: maximum, Paper: Paper{TaskID: task, Title: Titles[task], Prompt: prompt, Fields: fields, Parameters: map[string]float64{}, Reference: []Point{}}})
	}
	n := func(id, label, unit string, value float64) Field {
		return number(id, label, unit, 0, value, "按指定参数重新计算或读取波形；全部条件通过才获得该检查点分数。")
	}
	switch task {
	case "L1-1":
		point("在操作工作台设置 y(t)=2f(2(t−1))，记录参数与峰值时刻。", n("A", "幅度 A", "", 2), n("a", "尺度 a", "", 2), n("shift", "平移 t₀", "s", 1), n("peak", "峰值时刻", "s", 1.5))
		point("等面积窄脉冲，分别设宽度 0.2 与 0.1 s。点击脉冲顶部读取高度。", n("width1", "第一组宽度", "s", .2), n("height1", "第一组高度", "", 5), n("width2", "第二组宽度", "s", .1), n("height2", "第二组高度", "", 10))
	case "L1-2":
		point("系统 x+1，线性检验：x₁=x₂=u(t)，α=β=1。记录最大绝对差，非零差即反例。", n("alpha", "系数 α", "", 1), n("beta", "系数 β", "", 1), n("difference", "最大绝对差", "", 1))
		point("系统 x(2t)，时不变检验：x=u(t)，d=1 s。记录最大绝对差。", n("delay", "延迟 d", "s", 1), n("difference", "最大绝对差", "", 1))
	case "L1-3":
		point("关闭输入，初值 y₀=2，读取 t=1 s 零输入响应。", n("initial", "初值", "", 2), n("t", "读数时刻", "s", 1), n("zi", "零输入响应", "", 2/math.E))
		point("开启单位阶跃，A=1、y₀=2，在 t=1 s 核对两个分量及全响应。", n("A", "输入幅度", "", 1), n("initial", "初值", "", 2), n("zi", "零输入响应", "", 2/math.E), n("zs", "零状态响应", "", 1-1/math.E), n("total", "全响应", "", 1+1/math.E))
	case "L1-4":
		point("单位矩形与自身卷积，设 t=0.5 s，记录积分重叠区间与面积。", n("begin", "重叠起点 τ", "s", 0), n("end", "重叠终点 τ", "s", .5), n("area", "乘积面积", "", .5))
		point("心电滑动平均：W=0.02 s、t=0.41 s 与 W=0.08 s、t=0.44 s 两组。", n("width1", "第一组 W", "s", .02), n("y1", "第一组平均输出", "", MovingAverage(.41, .02)), n("width2", "第二组 W", "s", .08), n("y2", "第二组平均输出", "", MovingAverage(.44, .08)))
	case "L2-1":
		point("方波基频 10 Hz，K=3。记录实际项数和最高频率。", integer("count", "实际项数", 0, 2), n("highest", "最高频率", "Hz", 30))
		point("分别设置 K=7 和 K=15，读取最大值；超过目标峰高 1 代表有过冲。", n("maximum7", "K=7 最大值", "", HarmonicMaximum(7)), n("maximum15", "K=15 最大值", "", HarmonicMaximum(15)), choice("overshoot", "两组是否仍有过冲？", 0, "是", []string{"否"}, 19))
	case "L2-2":
		point("矩形脉冲 A=1、中心0，宽度分别 T=0.5 s 和 1 s，读取第一正零点。", n("zero1", "T=0.5 的第一正零点", "Hz", 2), n("zero2", "T=1 的第一正零点", "Hz", 1))
		f := n("phase", "f=0.25 Hz 处相位", "rad", -math.Pi/2)
		f.Kind = "phase"
		f.Tolerance = .03
		point("A=1、T=1 s、中心 t₀=1 s，核对相位和零频幅度。", f, n("dc", "X(0)", "", 1))
	case "L2-3":
		point("一阶低通分别设置 fc=2、40 Hz，以 10、50 Hz 探针读幅度比。", n("r2low", "fc=2 时 R(10)", "", 1/math.Sqrt(26)), n("r2high", "fc=2 时 R(50)", "", 1/math.Sqrt(626)), n("r40low", "fc=40 时 R(10)", "", 1/math.Sqrt(1.0625)), n("r40high", "fc=40 时 R(50)", "", 1/math.Sqrt(2.5625)), choice("feasible", "这两个截止频率是否有一个同时满足双指标？", 0, "都不满足", []string{"2 Hz 满足", "40 Hz 满足"}, 7))
		point("选择二阶陷波，中心50 Hz、α=10 s⁻¹；填最低阶并核对双幅度比。", integer("order", "最低阶数", 0, 2), n("center", "中心频率", "Hz", 50), n("alpha", "α", "s⁻¹", 10), n("low", "R(10)", "", Notch(50, 10, 10)), n("high", "R(50)", "", 0))
	case "L2-4":
		point("10 Hz 余弦以15 Hz采样，找到低于7.5 Hz的同样本余弦。", n("candidate", "候选频率", "Hz", 5), n("difference", "全部样本最大差", "", 0))
		point("3 kHz 余弦，以4 kHz采样；再开启二阶Butterworth抗混叠低通，fc=200 Hz。", n("alias", "未滤波时混叠频率", "Hz", 1000), integer("order", "滤波器阶数", 0, 2), n("cutoff", "截止频率", "Hz", 200), n("amplitude", "滤波后混叠幅度", "", 1/math.Sqrt(1+math.Pow(15, 4))))
	case "L3-1":
		point("指数输入 e^(−t)u(t)，模板 X(s)=c exp(−d₁s)/(s+b)。", n("c", "c", "", 1), n("b", "b", "", 1), n("d1", "d₁", "s", 0))
		point("延迟矩形：A=3，起始1 s，持续2 s。模板 X(s)=c[exp(−d₁s)−exp(−d₂s)]/(s+b)。", n("c", "c", "", 3), n("b", "b", "", 0), n("d1", "d₁", "s", 1), n("d2", "d₂", "s", 3))
	case "L3-2":
		point("y′+y=u(t)，零初值。填写 y=C+D exp(−t)，并用游标找到零状态 t90。", n("b0", "初始项 b₀", "", 0), n("C", "C", "", 1), n("D", "D", "", -1), n("t90", "t90", "s", math.Log(10)))
		point("保持单位阶跃，分别设 y₀=0.5 和2，更新初始项、D并读取 t=1 s 全响应。", n("b01", "y₀=0.5 时 b₀", "", .5), n("D1", "y₀=0.5 时 D", "", -.5), n("y1", "y₀=0.5 时 y(1)", "", 1-.5/math.E), n("b02", "y₀=2 时 b₀", "", 2), n("D2", "y₀=2 时 D", "", 1), n("y2", "y₀=2 时 y(1)", "", 1+1/math.E))
	case "L3-3":
		point("中心50 Hz，分别观察 α=5、60、−10 的零极点和稳定性。", n("zero", "零点正虚部（工作台按Hz）", "Hz", 50), n("real5", "α=5 极点实部", "s⁻¹", -5), n("real60", "α=60 极点实部", "s⁻¹", -60), n("realNegative", "α=−10 极点实部", "s⁻¹", 10), choice("stableNegative", "α=−10 的因果系统是否稳定？", 0, "不稳定", []string{"稳定"}, 4))
		point("使用同一组中心50 Hz、α=10 s⁻¹，在心电输出与频响页对照双指标。", n("center", "中心", "Hz", 50), n("alpha", "α", "s⁻¹", 10), n("low", "R(10)", "", Notch(50, 10, 10)), n("high", "R(50)", "", 0), choice("stable", "是否稳定？", 0, "稳定", []string{"不稳定"}, 3))
	case "L3-4":
		point("设脉宽 T=0.5、2 s，读取峰值并与阈值0.8比较。", n("peak1", "T=0.5 峰值", "", 1-math.Exp(-.5)), n("peak2", "T=2 峰值", "", 1-math.Exp(-2)), choice("pass", "哪组达到0.8？", 0, "仅 T=2 s", []string{"仅 T=0.5 s", "两组都达到"}, 8))
		a, b := n("failed", "相邻失败脉宽", "s", 1.6), n("passed", "最短成功脉宽", "s", 1.61)
		a.Tolerance = 1e-9
		b.Tolerance = 1e-9
		point("阈值0.8、步长0.01 s。提交相邻失败/成功方案，核对未经舍入的峰值。", a, b, n("peak", "成功方案峰值", "", 1-math.Exp(-1.61)))
	}
	// Parameter coordinates and frequencies are prescribed settings, not noisy
	// measurements. They must not be accepted with a loose amplitude tolerance.
	for i := range result {
		for j := range result[i].Paper.Fields {
			f := &result[i].Paper.Fields[j]
			if f.Unit == "s" || f.Unit == "Hz" {
				if f.ID != "t90" && f.ID != "peak" {
					f.Tolerance = 1e-6
				}
			}
			if f.ID == "t90" || task == "L1-1" && f.ID == "peak" || task == "L1-4" && (f.ID == "begin" || f.ID == "end") {
				f.Tolerance = .05
			}
			if task == "L2-2" && (f.ID == "zero1" || f.ID == "zero2") {
				f.Tolerance = .03
			}
			if (task == "L2-3" || task == "L3-3") && (f.ID == "low" || f.ID == "high" || f.ID == "r2low" || f.ID == "r2high" || f.ID == "r40low" || f.ID == "r40high") {
				f.Tolerance = .01
			}
			if task == "L2-4" && f.ID == "amplitude" {
				f.Tolerance = .002
			}
		}
	}
	return result
}
