package exports

import (
	"archive/zip"
	"bytes"
	"context"
	_ "embed"
	"encoding/json"
	"fmt"
	"sort"
	"strings"
	"unicode"

	class "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/classroom"
	lab "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/labassessment"
	"github.com/go-pdf/fpdf"
)

// Noto Sans SC, SIL Open Font License. Embedded for identical CJK output in
// Windows previews and Linux images, independent of installed server fonts.
//
//go:embed fonts/NotoSansSC-Regular.ttf
var reportFont []byte

type labDocument struct {
	AppVersion string               `json:"appVersion"`
	UpdatedAt  string               `json:"updatedAt"`
	Tasks      map[string]labRecord `json:"tasks"`
}
type labRecord struct {
	Params          map[string]any                `json:"params"`
	Answers         map[string]string             `json:"answers"`
	Prediction      string                        `json:"prediction"`
	PredictionDraft string                        `json:"predictionDraft"`
	Revisions       []struct{ Text, Time string } `json:"revisions"`
	Trials          []struct {
		Params, Measurements map[string]any
		Answers              map[string]string
		Time                 string
	} `json:"trials"`
	Derivation string `json:"derivation"`
	Analysis   string `json:"analysis"`
	Completion struct {
		Confirmed   bool
		ConfirmedAt *string
	} `json:"completion"`
}

func safeName(raw string) string {
	raw = strings.Map(func(r rune) rune {
		if unicode.IsControl(r) || strings.ContainsRune(`<>:"/\|?*`, r) {
			return '_'
		}
		return r
	}, raw)
	runes := []rune(strings.Trim(raw, " ."))
	if len(runes) > 100 {
		runes = runes[:100]
	}
	name := string(runes)
	if name == "" {
		name = "实验报告"
	}
	// A prefix also makes Windows reserved device names safe.
	base := strings.ToUpper(strings.Split(name, ".")[0])
	if base == "CON" || base == "PRN" || base == "AUX" || base == "NUL" || len(base) == 4 && (strings.HasPrefix(base, "COM") || strings.HasPrefix(base, "LPT")) {
		name = "_" + name
	}
	return name
}

var courseLabels = map[string]string{"L1": "实验一", "L2": "实验二", "L3": "实验三"}

func reportName(template string, d dataset, st class.Student, courseID string) (string, error) {
	if template == "" {
		template = "{班级}_{学号}_{姓名}_{实验}"
	}
	if len([]rune(template)) > 120 {
		return "", ErrInvalid
	}
	remaining := strings.NewReplacer("{班级}", "", "{学号}", "", "{姓名}", "", "{日期}", "", "{实验}", "").Replace(template)
	if strings.ContainsAny(remaining, "{}") {
		return "", ErrInvalid
	}
	name := strings.NewReplacer("{班级}", d.class.Name, "{学号}", st.Username, "{姓名}", st.DisplayName, "{日期}", d.now.In(beijing).Format("2006-01-02"), "{实验}", courseLabels[courseID]).Replace(template)
	return safeName(strings.TrimSuffix(name, ".pdf")), nil
}

func (s *Service) reports(ctx context.Context, d dataset, o Options) (*File, error) {
	// Validate the template even for an empty roster.
	if _, err := reportName(o.FilenameTemplate, d, class.Student{}, o.CourseID); err != nil {
		return nil, err
	}
	var buffer bytes.Buffer
	archive := zip.NewWriter(&buffer)
	names := map[string]bool{}
	for _, st := range d.students {
		if err := ctx.Err(); err != nil {
			return nil, err
		}
		v, err := s.learning.GetVirtualLab(ctx, st.ID)
		if err != nil {
			return nil, fmt.Errorf("student %d lab document: %w", st.ID, err)
		}
		doc := labDocument{}
		if v != nil && v.Document != "" {
			if err := json.Unmarshal([]byte(v.Document), &doc); err != nil {
				return nil, fmt.Errorf("student %d lab document: %w", st.ID, err)
			}
		}
		pdf, err := renderReport(d, st, doc, o.CourseID)
		if err != nil {
			return nil, fmt.Errorf("student %d PDF: %w", st.ID, err)
		}
		base, _ := reportName(o.FilenameTemplate, d, st, o.CourseID)
		name := base + ".pdf"
		for i := 2; names[strings.ToLower(name)]; i++ {
			name = fmt.Sprintf("%s_%d.pdf", base, i)
		}
		names[strings.ToLower(name)] = true
		entry, err := archive.Create(name)
		if err != nil {
			return nil, err
		}
		if _, err = entry.Write(pdf); err != nil {
			return nil, err
		}
	}
	if err := archive.Close(); err != nil {
		return nil, err
	}
	return &File{safeName(d.class.Name+"_"+courseLabels[o.CourseID]+"_实验报告") + ".zip", "application/zip", buffer.Bytes()}, nil
}

func renderReport(d dataset, st class.Student, doc labDocument, courseID string) ([]byte, error) {
	p := fpdf.New("P", "mm", "A4", "")
	p.SetMargins(18, 18, 18)
	p.SetAutoPageBreak(true, 18)
	p.AddUTF8FontFromBytes("noto", "", reportFont)
	p.SetTitle("实验报告 - "+st.DisplayName, true)
	p.SetFooterFunc(func() {
		p.SetY(-12)
		p.SetFont("noto", "", 9)
		p.CellFormat(0, 5, fmt.Sprintf("%s / %s     %d", st.Username, st.DisplayName, p.PageNo()), "", 0, "C", false, 0, "")
	})
	// The CJK font lacks superscript minus; preserve common scientific units
	// with an explicit exponent instead of emitting missing-glyph boxes.
	units := strings.NewReplacer("⁻¹", "^(-1)", "⁻²", "^(-2)", "⁻³", "^(-3)")
	line := func(text string) { p.SetFont("noto", "", 10); p.MultiCell(0, 6, units.Replace(text), "", "L", false) }
	field := func(label, value string) {
		if strings.TrimSpace(value) == "" {
			value = "未填写"
		}
		line(label + "：" + value)
	}
	p.AddPage()
	p.SetFont("noto", "", 22)
	p.MultiCell(0, 12, "信号与系统 · 实验报告", "", "L", false)
	p.Ln(5)
	field("班级", d.class.Name)
	field("学号", st.Username)
	field("姓名", st.DisplayName)
	field("实验", courseLabels[courseID]+" · "+courseNames[courseID])
	field("导出时间（北京时间）", date(d.now))
	line("本报告汇集所选实验的已保存记录及本班正式验收结果。练习完成确认与正式验收分别列示；未填写、未提交均如实保留。")
	if doc.UpdatedAt != "" {
		field("实验记录更新时间", doc.UpdatedAt)
		field("实验引擎版本", doc.AppVersion)
	} else {
		line("该学生尚无已保存的实验练习记录。")
	}
	p.Ln(4)
	for _, l := range d.labs {
		if l.item.CourseID != courseID {
			continue
		}
		score, count := labScore(l.states[st.ID], l.item.CourseID)
		line(fmt.Sprintf("%s %s：%.2f / 100；正式验收 %d / 4 项", l.item.CourseID, courseNames[l.item.CourseID], score, count))
	}
	if len(d.labs) == 0 {
		line("本班尚无已开始的正式实验考核。")
	}
	p.Ln(4)
	line("任务完成情况")
	detailed := map[string]bool{}
	for _, course := range []string{courseID} {
		for _, id := range lab.TaskIDs(course) {
			r := doc.Tasks[id]
			practice, formal := "暂无练习记录", "未发布考核"
			detailed[id] = len(r.Trials) > 0 || r.Prediction != "" || r.PredictionDraft != "" || r.Analysis != "" || r.Derivation != "" || len(r.Revisions) > 0 || r.Completion.Confirmed
			for _, answer := range r.Answers {
				if strings.TrimSpace(answer) != "" {
					detailed[id] = true
				}
			}
			if detailed[id] {
				practice = "练习进行中"
			}
			if r.Completion.Confirmed {
				practice = "练习已确认完成"
			}
			for _, l := range d.labs {
				if l.item.CourseID != course {
					continue
				}
				formal = "正式验收未提交"
				if task := l.states[st.ID].Tasks[id]; task != nil {
					detailed[id] = detailed[id] || len(task.Attempts) > 0 || len(task.Checkpoints) > 0 || task.Correction != nil
					for _, a := range task.Attempts {
						if a.SubmittedAt != nil && a.Result != nil {
							formal = "正式验收已提交"
							break
						}
					}
				}
			}
			line(fmt.Sprintf("%s  %s；%s；%d 组试验", id, practice, formal, len(r.Trials)))
		}
	}
	for _, course := range []string{courseID} {
		for _, id := range lab.TaskIDs(course) {
			if !detailed[id] {
				continue
			}
			p.AddPage()
			paper, err := lab.PaperFor(id, 0)
			if err != nil {
				return nil, err
			}
			p.SetFont("noto", "", 16)
			p.MultiCell(0, 9, id+" · "+paper.Title, "", "L", false)
			p.Ln(3)
			r, exists := doc.Tasks[id]
			practice := "未确认完成"
			if r.Completion.Confirmed {
				practice = "学生已确认完成"
				if r.Completion.ConfirmedAt != nil {
					practice += "（" + *r.Completion.ConfirmedAt + "）"
				}
			}
			field("练习状态", practice)
			for _, l := range d.labs {
				if l.item.CourseID != course {
					continue
				}
				t := l.states[st.ID].Tasks[id]
				if t == nil {
					field("正式验收", "未提交，当前得分 0 / 25")
					continue
				}
				op, independent, concepts, total := t.Scores()
				submitted := 0
				for _, a := range t.Attempts {
					if a.SubmittedAt != nil && a.Result != nil {
						submitted++
						line(fmt.Sprintf("正式验收第 %d 次：%.2f / 20，提交于 %s", submitted, a.Result.Score, date(*a.SubmittedAt)))
					}
				}
				if submitted == 0 {
					line("正式验收：未提交")
				}
				line(fmt.Sprintf("当前得分 %.2f / 25；操作 %.2f / 5；独立作答 %.2f / 15；规律判断 %.2f / 5", total, op, independent, concepts))
				if t.Correction != nil {
					field("教师更正", fmt.Sprintf("%.2f 分；%s；%s", t.Correction.Score, t.Correction.Reason, date(t.Correction.At)))
				}
			}
			if !exists {
				line("尚无本任务练习记录。")
				continue
			}
			field("预测", r.Prediction)
			if r.PredictionDraft != "" && r.PredictionDraft != r.Prediction {
				field("未提交的预测草稿", r.PredictionDraft)
			}
			for _, revision := range r.Revisions {
				field("预测修订（"+revision.Time+"）", revision.Text)
			}
			field("当前参数", values(r.Params))
			field("当前作答", values(r.Answers))
			field("推导过程", r.Derivation)
			line(fmt.Sprintf("已保存试验：%d 组", len(r.Trials)))
			for i, trial := range r.Trials {
				p.Ln(3)
				line(fmt.Sprintf("试验 %d · %s", i+1, trial.Time))
				field("参数", values(trial.Params))
				field("作答", values(trial.Answers))
				field("测量与观察", values(trial.Measurements))
			}
			p.Ln(4)
			field("反思与结论", r.Analysis)
		}
	}
	var buffer bytes.Buffer
	if err := p.Output(&buffer); err != nil {
		return nil, err
	}
	return buffer.Bytes(), nil
}
func values[T any](m map[string]T) string {
	keys := make([]string, 0, len(m))
	for k := range m {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	parts := []string{}
	for _, k := range keys {
		value := any(m[k])
		if s, ok := value.(string); ok {
			parts = append(parts, k+" = "+s)
		} else {
			raw, _ := json.Marshal(value)
			parts = append(parts, k+" = "+string(raw))
		}
	}
	return strings.Join(parts, "； ")
}
