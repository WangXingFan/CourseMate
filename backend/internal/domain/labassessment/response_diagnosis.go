package labassessment

import (
	"fmt"
	"math"
	"math/rand"
)

var responseTests = []Option{
	{"inputOff", "两次输入都关闭，分别保留各自初值"},
	{"resetInitial", "两次初值都清零，分别保留各自输入"},
	{"clearBoth", "两次输入和初值全部清零"},
	{"repeat", "保持原条件，直接重复运行"},
}

func responseChoice(id, label string, points float64, answer string, options []Option, seed int) Field {
	f := Field{ID: id, Label: label, Points: points, Kind: "choice", Answer: answer, Options: []Option{}}
	for _, index := range rand.New(rand.NewSource(int64(seed))).Perm(len(options)) {
		f.Options = append(f.Options, options[index])
	}
	return f
}

func responseReference(initial, amplitude float64) []Point {
	points := make([]Point, 161)
	for i := range points {
		time := float64(i) / 20
		points[i] = Point{time, amplitude + (initial-amplitude)*math.Exp(-time)}
	}
	return points
}

func responsePrediction(initial, amplitude float64, target string) string {
	if target == "initial" && initial == 2 || target == "input" && amplitude == 1 {
		return "overlap"
	}
	return "different"
}

func responseTestField(target string, seed int) Field {
	answer, label := "inputOff", "只检查初始状态的影响，应该怎样测试？"
	explanation := "两次都关闭输入，保留各自初值，输出只剩初始状态引起的零输入响应。"
	if target == "input" {
		answer, label = "resetInitial", "只检查外部输入的影响，应该怎样测试？"
		explanation = "两次都把初值清零，保留各自输入，输出只剩输入引起的零状态响应。"
	}
	f := responseChoice("test", label, 5, answer, responseTests, seed)
	f.Explanation = explanation
	return f
}

func responsePredictionField(initial, amplitude float64, target string, seed int) Field {
	label := "按题目目标隔离初始状态后，两条曲线在整个观察区间内是否重合？"
	explanation := "关闭输入后比较各自初值；初值相同才会全程重合。长期都衰减到零不代表全程重合。"
	if target == "input" {
		label = "按题目目标隔离外部输入后，两条曲线在整个观察区间内是否重合？"
		explanation = "初值都清零后比较各自输入；输入相同才会全程重合。仅起点相同不代表全程重合。"
	}
	f := responseChoice("prediction", label, 5, responsePrediction(initial, amplitude, target), []Option{{"overlap", "全程重合"}, {"different", "存在不重合的时段"}}, seed)
	f.Explanation = explanation
	return f
}

func responseDiagnosisPaper(v int) Paper {
	initial, amplitude := 2., 1.
	source := []string{"initial", "input", "both", "neither"}[v%4]
	if source == "initial" || source == "both" {
		initial = pick(v/8, .5, 1, 1.5, 2.5)
	}
	if source == "input" || source == "both" {
		amplitude = pick(v/16, .5, 1.5, 2)
	}
	target := []string{"initial", "input"}[(v/4)%2]
	p := Paper{TaskID: "L1-3", Title: Titles["L1-3"], Variant: v,
		Prompt:     "同一系统 y′+y=x(t)。调整前输入为单位阶跃、初值为2；调整后可能改变初值、阶跃幅度，或两者。比较调整前后的输出曲线。",
		Formula:    "调整前：x(t)=u(t)，y(0)=2。调整后条件由图判断；系统方程保持不变。",
		Parameters: map[string]float64{"A": amplitude, "y0": initial, "target": float64((v / 4) % 2)}, Reference: responseReference(initial, amplitude)}
	f := responseChoice("source", "从两条曲线判断，调整后改变了什么？", 5, source,
		[]Option{{"initial", "只改变初始状态"}, {"input", "只改变外部输入"}, {"both", "初始状态和外部输入都改变"}, {"neither", "两者都未改变"}}, v*17+1)
	f.Explanation = fmt.Sprintf("调整后初值为%.3g，阶跃幅度为%.3g。起点反映初值，长期趋向反映持续输入；与调整前的2和1比较即可判断。", initial, amplitude)
	p.Fields = []Field{f, responseTestField(target, v*17+2), responsePredictionField(initial, amplitude, target, v*17+3)}
	return p
}

func responseCheckpoints() []Checkpoint {
	result := []Checkpoint{}
	for i, target := range []string{"initial", "input"} {
		initial, amplitude := .5, 1.
		if target == "input" {
			initial, amplitude = 2, 1.5
		}
		maximum := float64(i + 2)
		test := responseTestField(target, 93+i)
		observation := responsePredictionField(initial, amplitude, target, 103+i)
		observation.ID = "observation"
		observation.Label = "运行所选测试后，观察到的两条曲线是否全程重合？"
		test.Points, observation.Points = maximum/2, maximum/2
		result = append(result, Checkpoint{Maximum: maximum, Paper: Paper{TaskID: "L1-3", Title: Titles["L1-3"],
			Prompt:  "同一系统 y′+y=x(t)。调整前输入为单位阶跃、初值为2；调整后条件见图。",
			Formula: "同一系统 y′+y=x(t)。调整前：x(t)=u(t)，y(0)=2。",
			Fields:  []Field{test, observation}, Reference: responseReference(initial, amplitude),
			Parameters:  map[string]float64{"A": amplitude, "y0": initial, "target": float64(i)},
			Explanation: test.Explanation + observation.Explanation}})
	}
	return result
}
