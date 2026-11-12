package labassessment

import (
	"fmt"
	"math/rand"
)

var blackBoxModels = []string{"square", "delay", "timescale"}

func blackBoxObservations(model string) []Observation {
	rectangle := func(height, start, width float64) []Point {
		return []Point{{0, 0}, {start, 0}, {start, height}, {start + width, height}, {start + width, 0}, {4, 0}}
	}
	observations := []Observation{}
	for _, probe := range []string{"baseline", "double", "shift"} {
		height, start, width := 1., 1., 1.
		if probe == "double" {
			height = 2
		}
		if probe == "shift" {
			start = 2
		}
		input := rectangle(height, start, width)
		switch model {
		case "square":
			height *= height
		case "delay":
			start++
		case "timescale":
			start /= 2
			width /= 2
		}
		observations = append(observations, Observation{ID: probe, Input: input, Output: rectangle(height, start, width)})
	}
	return observations
}

func blackBoxPaper(v int) Paper {
	index := v % len(blackBoxModels)
	model := blackBoxModels[index]
	height, delay := pick(v/3, .5, 1.5, 3), pick(v/9, .5, 1.5, 2)
	labels := []string{"把输入幅度平方", "固定延迟1秒", "把时间压缩为一半", "把输入幅度放大为2倍", "把输入幅度缩小为一半", "原样输出输入信号", "给输入幅度加1", "将输入上下翻转", "固定延迟2秒", "固定提前1秒", "把时间拉伸为2倍", "把输入幅度立方"}
	wrong := append(append([]string{}, labels[:index]...), labels[index+1:]...)
	order := rand.New(rand.NewSource(int64(v*31 + 7))).Perm(len(wrong))
	identify := choice("model", "① 哪个候选规律符合全部测试？", 5, labels[index], []string{wrong[order[0]], wrong[order[1]]}, v*17+1)
	identify.Explanation = []string{
		"基准高度1对应输出1，输入高度2对应输出4；脉冲起点与宽度不变，符合幅度平方。",
		"三次测试中，输出的高度、宽度均不变，起点总比输入晚1秒，符合固定延迟1秒。",
		"输出起点和宽度都是输入的一半；输入延后1秒时输出只延后0.5秒，符合时间压缩。",
	}[index]
	outputHeight, outputShift := height, delay
	if model == "square" {
		outputHeight *= outputHeight
	}
	if model == "timescale" {
		outputShift /= 2
	}
	return Paper{TaskID: "L1-2", Title: Titles["L1-2"], Variant: v,
		Prompt:     "阅读同一台黑箱的三次独立输入与输出，分别回答下方问题。",
		Formula:    "基准：高度1、从1 s开始、持续1 s的矩形脉冲。幅度测试只改变高度，时移测试只改变起点；两个预测分别从基准出发。",
		Parameters: map[string]float64{"model": float64(index), "height": height, "delay": delay}, Reference: []Point{}, Observations: blackBoxObservations(model),
		Fields: []Field{identify,
			number("outputHeight", fmt.Sprintf("② 只把基准输入高度改为%.3g时，输出高度是多少？", height), "", 5, outputHeight, "按本台真实规律独立计算：平方器对输入高度平方，其余两种规律保持高度。"),
			number("outputShift", fmt.Sprintf("③ 输入相对基准再延后%.3g s时，输出起点相对基准延后多少？", delay), "s", 5, outputShift, "固定延迟器的固有1秒延迟在两次输出相减时抵消；平方器与固定延迟器都等量延后，时间压缩器只延后输入时移的一半。"),
		}}
}

func blackBoxCheckpoints() []Checkpoint {
	scale := choice("scaling", "比较两次输出后，这组测试能否否定线性？", 1, "构成非线性的有效反例", []string{"已经证明该系统线性", "仅凭这组结果不能否定线性"}, 119)
	scale.Explanation = "若系统线性，T[2x]应为2T[x]；实测为4而非2，因此这一个有效反例即可否定线性。"
	shift := choice("timing", "比较输入和输出的时移，这组测试说明什么？", 1.5, "构成非时不变性的有效反例", []string{"已经证明该系统时不变", "输出也变晚，所以仍满足时不变性"}, 120)
	shift.Explanation = "时不变要求输入延后d时输出也仅延后同一个d；本次输出只延后0.5秒，否定时不变性。"
	return []Checkpoint{
		{Maximum: 2, Paper: Paper{TaskID: "L1-2", Title: Titles["L1-2"], Prompt: "切换同一台黑箱的基准与幅度加倍测试。", Parameters: map[string]float64{}, Reference: []Point{}, Observations: blackBoxObservations("square")[:2], Fields: []Field{
			number("outputHeight", "输入高度加倍到2后，输出高度是多少？", "", 1, 4, "基准输出高度为1，幅度加倍测试中的输出高度为4。"), scale,
		}}},
		{Maximum: 3, Paper: Paper{TaskID: "L1-2", Title: Titles["L1-2"], Prompt: "切换另一台黑箱的基准与输入延后1秒测试。", Parameters: map[string]float64{}, Reference: []Point{}, Observations: []Observation{blackBoxObservations("timescale")[0], blackBoxObservations("timescale")[2]}, Fields: []Field{
			number("outputShift", "输出相对基准延后的时间", "s", 1.5, .5, "两次输出起点为0.5秒与1秒，差值为0.5秒。"), shift,
		}}},
	}
}
