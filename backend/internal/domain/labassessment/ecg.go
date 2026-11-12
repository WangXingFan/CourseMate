package labassessment

import "fmt"

func ecgPaper(v int) Paper {
	frequency := pick(v, 25, 50, 100)
	period := 1000 / frequency
	width, time := pick(v/3, 40, 60, 100), pick(v/9, 400, 460, 520)
	p := Paper{TaskID: "L1-4", Title: Titles["L1-4"], Variant: v,
		Parameters: map[string]float64{"frequency": frequency, "widthMs": width, "timeMs": time}, Reference: []Point{},
		Prompt:  "以下三个因果滑动平均问题分别作答；忽略启动边界。",
		Formula: "因果滑动平均：把区间 [t−W,t] 内的数据取平均，结果记在时刻 t；矩形平均窗的总面积为1。"}
	window := choice("noiseWindow", fmt.Sprintf("① 理想正弦干扰为 %.0f Hz（周期 %.0f ms），能抵消它的最短候选窗是多少？", frequency, period), 5, fmt.Sprintf("%.0f ms", period), []string{fmt.Sprintf("%.0f ms", period/2), fmt.Sprintf("%.0f ms", period*4)}, v*17+1)
	window.Explanation = fmt.Sprintf("完整周期内正负面积相抵，半周期一般不抵消。候选中 %.0f ms 为一个完整周期，比四周期窗更短。", period)
	plan := choice("ecgPlan", "② 同一段含50 Hz干扰的心电分别用20 ms（方案A）和80 ms（方案B）平均，且两者都抵消理想干扰。哪种方案更能保留R波？", 5, "方案A：20 ms", []string{"方案B：80 ms，越平滑越好", "两种方案都不会改变R波"}, v*17+2)
	plan.Explanation = "同一模型中，20 ms窗的R峰约0.87，80 ms窗约0.28；宽窗混合更多相邻数据，R波更低、更宽。两者均抵消50 Hz正弦时，短窗损伤较小。"
	center := number("windowCenter", fmt.Sprintf("③ 输出时刻为%.0f ms、因果窗宽为%.0f ms，参与平均的数据中心时刻是多少？", time, width), "ms", 5, time-width/2, "窗口两端的中点为 ((t−W)+t)/2=t−W/2。它早于输出时刻，不需要计算心电积分。")
	center.Tolerance = .1
	p.Fields = []Field{window, plan, center}
	return p
}

func ecgCheckpoints() []Checkpoint {
	noise := choice("ecgNoise", "比较两种窗宽后，20 ms的干扰输出相对10 ms怎样变化？", 2, "接近零线，10 ms仍有波纹", []string{"波纹变得更大", "两者保持原波纹"}, 109)
	noise.Explanation = "50 Hz周期为20 ms。20 ms窗覆盖完整周期，正负面积相抵；10 ms窗通常仍留有波纹。观察窗口已填满后的输出。"
	side := choice("ecgTiming", "拖动输出时刻后，阴影窗口的中心总在输出时刻的哪一侧？", 1.5, "更早", []string{"相同", "更晚，用到了未来数据"}, 110)
	side.Explanation = "只取[t−W,t]，数据中心为t−W/2，早于输出时刻。"
	lag := choice("ecgLag", "从20 ms改为80 ms后，窗口中心到输出时刻的时间差怎样变化？", 1.5, "由10 ms变为40 ms", []string{"始终为0", "由20 ms变为80 ms"}, 111)
	lag.Explanation = "两个时间中心差分别为20/2=10 ms和80/2=40 ms；不应把复杂R峰的位移当作精确测量。"
	return []Checkpoint{
		{Maximum: 2, Paper: Paper{TaskID: "L1-4", Title: Titles["L1-4"], Prompt: "切换10 ms和20 ms，比较同一条50 Hz干扰平均后的波纹，再作判断。", Fields: []Field{noise}, Parameters: map[string]float64{}, Reference: []Point{}}},
		{Maximum: 3, Paper: Paper{TaskID: "L1-4", Title: Titles["L1-4"], Prompt: "比较20 ms和80 ms，拖动输出时刻，观察左图阴影、窗口中心和当前输出时刻，再作判断。", Fields: []Field{side, lag}, Parameters: map[string]float64{}, Reference: []Point{}}},
	}
}
