package exports

import (
	"bytes"
	_ "embed"
	"fmt"
	"slices"
	"sort"
	"strings"
	"time"

	class "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/classroom"
	"github.com/xuri/excelize/v2"
)

// The school layouts contain only headers, styles and one blank student row.
//
//go:embed templates/grade-registers.xlsx
var registerTemplate []byte

var registerNames = map[string]string{
	"summary": "课程过程考核成绩登记表", "attendance": "学生考勤登记表",
	"performance": "课堂成绩登记表", "labs": "实验成绩登记表",
	"ai_activity": "AI活跃度成绩登记表", "homeworks": "作业成绩登记表",
}

func registerWorkbook(d dataset, o Options) (*excelize.File, error) {
	f, err := excelize.OpenReader(bytes.NewReader(registerTemplate))
	if err != nil {
		return nil, fmt.Errorf("open grade register template: %w", err)
	}
	for _, definition := range f.GetDefinedName() {
		if err := f.DeleteDefinedName(&definition); err != nil {
			f.Close()
			return nil, err
		}
	}
	for _, kind := range []string{"summary", "attendance", "performance", "labs", "ai_activity", "homeworks"} {
		name := registerNames[kind]
		if o.Kind != kind && !(o.Kind == "summary" && o.Weights[kind] > 0) {
			err = f.DeleteSheet(name)
		} else {
			switch kind {
			case "attendance", "performance":
				err = activityRegisters(f, d, kind)
			case "ai_activity":
				err = aiRegister(f, d)
			default:
				err = weightedRegister(f, d, o, kind)
			}
		}
		if err != nil {
			f.Close()
			return nil, fmt.Errorf("fill %s: %w", name, err)
		}
	}
	f.SetActiveSheet(0)
	return f, nil
}

type registerColumn struct {
	title  string
	weight float64
	score  func(class.Student) (float64, bool)
}

func registerColumns(d dataset, o Options, kind string) []registerColumn {
	columns := []registerColumn{}
	switch kind {
	case "summary":
		for _, key := range []string{"homeworks", "labs", "attendance", "performance", "ai_activity"} {
			if o.Weights[key] > 0 {
				columns = append(columns, registerColumn{titles[key], o.Weights[key], func(st class.Student) (float64, bool) { return d.score(st.ID, key) }})
			}
		}
	case "homeworks":
		items := slices.Clone(d.homeworks)
		sort.SliceStable(items, func(i, j int) bool { return items[i].item.StartsAt.Before(items[j].item.StartsAt) })
		for _, h := range items {
			columns = append(columns, registerColumn{h.item.Title, 100 / float64(len(items)), func(st class.Student) (float64, bool) {
				sub, submitted := h.submissions[st.ID]
				if h.item.Total() == 0 || !submitted && !h.item.AppliesTo(st.JoinedAt) {
					return 0, false
				}
				return float64(sub.Score) / float64(h.item.Total()) * 100, true
			}})
		}
	case "labs":
		items := slices.Clone(d.labs)
		sort.SliceStable(items, func(i, j int) bool { return items[i].item.CourseID < items[j].item.CourseID })
		for _, l := range items {
			columns = append(columns, registerColumn{courseLabels[l.item.CourseID], 100 / float64(len(items)), func(st class.Student) (float64, bool) {
				state := l.states[st.ID]
				if len(state.Tasks) == 0 && !l.item.AppliesTo(st.JoinedAt) {
					return 0, false
				}
				score, _ := labScore(state, l.item.CourseID)
				return score, true
			}})
		}
	}
	return columns
}

func weightedRegister(f *excelize.File, d dataset, o Options, kind string) error {
	name := registerNames[kind]
	columns := registerColumns(d, o, kind)
	count := max(1, len(columns))
	oldCount := 4
	if kind == "summary" {
		oldCount = 5
	}
	if err := resizeRegisterColumns(f, name, oldCount, count); err != nil {
		return err
	}
	if err := registerHeading(f, name, d); err != nil {
		return err
	}
	if kind != "summary" {
		if err := f.SetCellStr(name, "A4", "注：各项均为百分制，按适用项目等权平均；未提交计0分，不适用的项目留空；取消考试资格由教师在备注注明。"); err != nil {
			return err
		}
	}
	for i, column := range columns {
		if err := f.SetCellStr(name, cellAt(5+i, 5), column.title); err != nil {
			return err
		}
		if err := f.SetCellFloat(name, cellAt(5+i, 6), column.weight/100, -1, 64); err != nil {
			return err
		}
		format := "0%"
		if percent := rounded(column.weight); percent != float64(int(percent)) {
			format = "0.00%"
		}
		if err := registerNumberFormat(f, name, cellAt(5+i, 6), cellAt(5+i, 6), format); err != nil {
			return err
		}
	}
	if len(columns) == 0 {
		if err := f.SetCellStr(name, "E5", "暂无考核"); err != nil {
			return err
		}
	}
	if err := registerRows(f, name, 8, len(d.students)); err != nil {
		return err
	}
	for i, st := range d.students {
		row := i + 8
		values := []any{i + 1, st.Username, st.DisplayName, d.class.Name}
		missing := []string{}
		for _, column := range columns {
			value, ok := column.score(st)
			if ok {
				// Keep full precision for the total; the cell format controls display.
				values = append(values, value)
			} else {
				values = append(values, "")
				missing = append(missing, column.title)
			}
		}
		if err := f.SetSheetRow(name, cellAt(1, row), &values); err != nil {
			return err
		}
		score, valid := d.score(st.ID, kind)
		if kind == "summary" {
			score, valid = 0, len(missing) == 0
			for _, column := range columns {
				value, _ := column.score(st)
				score += value * column.weight / 100
			}
		}
		rangeRef := fmt.Sprintf("E%d:%s", row, cellAt(4+count, row))
		formula := fmt.Sprintf(`IF(COUNT(%s)=0,"",ROUND(AVERAGE(%s),2))`, rangeRef, rangeRef)
		if kind == "summary" {
			end, _ := excelize.ColumnNumberToName(4 + count)
			formula = fmt.Sprintf(`IF(COUNT(%s)=%d,ROUND(SUMPRODUCT(%s,$E$6:$%s$6),2),"")`, rangeRef, count, rangeRef, end)
		}
		if err := registerTotal(f, name, cellAt(5+count, row), formula, score, valid); err != nil {
			return err
		}
		note := ""
		if !valid {
			note = "无考核数据"
			if kind == "summary" {
				note = "缺少考核数据"
			}
		} else if len(missing) > 0 {
			note = "部分项不适用"
		}
		if err := f.SetCellStr(name, cellAt(6+count, row), note); err != nil {
			return err
		}
		if len(missing) > 0 {
			if err := f.AddComment(name, excelize.Comment{Cell: cellAt(6+count, row), Author: "CourseMate", Text: "缺少数据或不适用：" + strings.Join(missing, "、")}); err != nil {
				return err
			}
		}
	}
	for col := 5; col <= 5+count; col++ {
		if err := registerNumberFormat(f, name, cellAt(col, 8), cellAt(col, max(8, 7+len(d.students))), "0.00"); err != nil {
			return err
		}
	}
	orientation := "portrait"
	if kind == "summary" || count > 4 {
		orientation = "landscape"
	}
	return registerPrint(f, name, 8, 6+count, len(d.students), orientation)
}

func resizeRegisterColumns(f *excelize.File, name string, oldCount, count int) error {
	for n := count; n < oldCount; n++ {
		col, _ := excelize.ColumnNumberToName(5 + count)
		if err := f.RemoveCol(name, col); err != nil {
			return err
		}
	}
	if count <= oldCount {
		return nil
	}
	col, _ := excelize.ColumnNumberToName(5 + oldCount)
	if err := f.InsertCols(name, col, count-oldCount); err != nil {
		return err
	}
	for c := 5 + oldCount; c < 5+count; c++ {
		col, _ := excelize.ColumnNumberToName(c)
		if err := f.SetColWidth(name, col, col, 13); err != nil {
			return err
		}
		for r := 5; r <= 8; r++ {
			style, err := f.GetCellStyle(name, cellAt(4+oldCount, r))
			if err != nil {
				return err
			}
			if err := f.SetCellStyle(name, cellAt(c, r), cellAt(c, r), style); err != nil {
				return err
			}
		}
		if err := f.SetCellStr(name, cellAt(c, 7), "分数"); err != nil {
			return err
		}
	}
	return nil
}

func registerHeading(f *excelize.File, name string, d dataset) error {
	p := d.profile
	if err := f.SetCellStr(name, "A2", fmt.Sprintf("学年学期：%s    课程代码：%s    课程名称：%s", p.AcademicTerm, p.CourseCode, p.CourseName)); err != nil {
		return err
	}
	return f.SetCellStr(name, "A3", fmt.Sprintf("教师姓名：%s    所属学院：%s    上课教室：%s", p.TeacherName, p.College, p.TeachingLocation))
}

func aiRegister(f *excelize.File, d dataset) error {
	name := registerNames["ai_activity"]
	if err := registerHeading(f, name, d); err != nil {
		return err
	}
	if d.aiActivity != nil {
		note := fmt.Sprintf("统计日期：%s 至 %s。按已结束考核周等权平均，临时周不计入；无适用周留空。", d.aiActivity.StartDate, d.aiActivity.EndDate)
		if err := f.SetCellStr(name, "A4", note); err != nil {
			return err
		}
	}
	if err := registerRows(f, name, 6, len(d.students)); err != nil {
		return err
	}
	for i, st := range d.students {
		var value any = ""
		note := "暂无评价"
		if score, ok := d.score(st.ID, "ai_activity"); ok {
			value, note = rounded(score), ""
		}
		values := []any{i + 1, st.Username, st.DisplayName, d.class.Name, value, note}
		if err := f.SetSheetRow(name, cellAt(1, i+6), &values); err != nil {
			return err
		}
	}
	if err := registerNumberFormat(f, name, "E6", cellAt(5, max(6, 5+len(d.students))), "0.00"); err != nil {
		return err
	}
	return registerPrint(f, name, 6, 6, len(d.students), "portrait")
}

func cellAt(col, row int) string {
	cell, _ := excelize.CoordinatesToCellName(col, row)
	return cell
}

func registerRows(f *excelize.File, name string, first, count int) error {
	// Copy the blank template row before writing values or formulas.
	for row := first + 1; row < first+count; row++ {
		if err := f.DuplicateRowTo(name, first, row); err != nil {
			return err
		}
	}
	return nil
}

func registerTotal(f *excelize.File, name, cell, formula string, score float64, valid bool) error {
	if valid {
		// SetCellFormula preserves this cached result for readers without calculation.
		if err := f.SetCellFloat(name, cell, rounded(score), -1, 64); err != nil {
			return err
		}
	}
	return f.SetCellFormula(name, cell, formula)
}

func registerNumberFormat(f *excelize.File, name, first, last, format string) error {
	id, err := f.GetCellStyle(name, first)
	if err != nil {
		return err
	}
	style, err := f.GetStyle(id)
	if err != nil {
		return err
	}
	style.NumFmt, style.CustomNumFmt = 0, &format
	style.Fill = excelize.Fill{Type: "pattern", Pattern: 0}
	// Imported Excel border colors may include an alpha byte; NewStyle expects RGB.
	for i := range style.Border {
		style.Border[i].Color = "000000"
	}
	id, err = f.NewStyle(style)
	if err != nil {
		return err
	}
	return f.SetCellStyle(name, first, last, id)
}

func registerPrint(f *excelize.File, name string, first, columns, students int, orientation string) error {
	size, width, height := 9, 1, 0 // A4; allow vertical pagination for large rosters.
	if students <= 40 {
		height = 1
	}
	fit := true
	if err := f.SetSheetProps(name, &excelize.SheetPropsOptions{FitToPage: &fit}); err != nil {
		return err
	}
	if err := f.SetPageLayout(name, &excelize.PageLayoutOptions{Size: &size, Orientation: &orientation, FitToWidth: &width, FitToHeight: &height}); err != nil {
		return err
	}
	column, _ := excelize.ColumnNumberToName(columns)
	if err := f.SetDefinedName(&excelize.DefinedName{Name: "_xlnm.Print_Area", Scope: name, RefersTo: fmt.Sprintf("'%s'!$A$1:$%s$%d", name, column, first+max(1, students)-1)}); err != nil {
		return err
	}
	if err := f.SetDefinedName(&excelize.DefinedName{Name: "_xlnm.Print_Titles", Scope: name, RefersTo: fmt.Sprintf("'%s'!$1:$%d", name, first-1)}); err != nil {
		return err
	}
	return f.SetPanes(name, &excelize.Panes{Freeze: true, YSplit: first - 1, TopLeftCell: cellAt(1, first), ActivePane: "bottomLeft"})
}

type registerActivity struct {
	title string
	at    time.Time
	value func(class.Student) any
}

func activityRegisterColumns(d dataset, kind string) []registerActivity {
	items := []registerActivity{}
	if kind == "attendance" {
		labels := map[string]string{"present": "√", "late": "○", "absent": "×", "excused": "●"}
		for _, a := range d.attendance {
			items = append(items, registerActivity{a.item.Title, a.item.StartsAt, func(st class.Student) any {
				if r, ok := a.records[st.ID]; ok {
					return labels[r.Status]
				}
				return "—"
			}})
		}
	} else if d.performance != nil {
		for _, a := range d.performance.Activities {
			items = append(items, registerActivity{a.Title, a.ClosedAt, func(st class.Student) any {
				points, total := 0, 0
				for _, student := range d.performance.Students {
					if student.UserID != st.ID {
						continue
					}
					for _, evidence := range student.Evidence {
						if evidence.QuizID == a.ID {
							points += evidence.Points
							total += evidence.Total
						}
					}
				}
				if total == 0 {
					return ""
				}
				return rounded(float64(points) / float64(total) * 100)
			}})
		}
	}
	sort.SliceStable(items, func(i, j int) bool { return items[i].at.Before(items[j].at) })
	return items
}

func activityRegisters(f *excelize.File, d dataset, kind string) error {
	base := registerNames[kind]
	items := activityRegisterColumns(d, kind)
	pages := max(1, (len(items)+15)/16)
	// Copy all continuation pages while the source is still blank.
	names := []string{base}
	index, err := f.GetSheetIndex(base)
	if err != nil {
		return err
	}
	for page := 1; page < pages; page++ {
		name := fmt.Sprintf("%s（%d）", base, page+1)
		i, err := f.NewSheet(name)
		if err != nil {
			return err
		}
		if err = f.CopySheet(index, i); err != nil {
			return err
		}
		if err = f.MoveSheet(name, f.GetSheetName(index+page)); err != nil {
			return err
		}
		names = append(names, name)
	}
	for page, name := range names {
		if err := activityRegisterPage(f, d, kind, name, page, items); err != nil {
			return err
		}
	}
	return nil
}

func activityRegisterPage(f *excelize.File, d dataset, kind, name string, page int, items []registerActivity) error {
	start, last, code, course, college, location := 5, 21, "I2", "P2", "I3", "P3"
	if kind == "attendance" {
		start, last, code, course, college, location = 6, 22, "J2", "Q2", "J3", "Q3"
	}
	p := d.profile
	for cell, value := range map[string]string{"D2": p.AcademicTerm, code: p.CourseCode, course: p.CourseName, "D3": p.TeacherName, college: p.College, location: p.TeachingLocation} {
		if err := f.SetCellStr(name, cell, value); err != nil {
			return err
		}
	}
	for i := page * 16; i < min(len(items), (page+1)*16); i++ {
		cell := cellAt(start+i-page*16, 5)
		heading := fmt.Sprintf("第%d次\n%s", i+1, items[i].at.In(beijing).Format("01-02"))
		if err := f.SetCellStr(name, cell, heading); err != nil {
			return err
		}
		if err := f.AddComment(name, excelize.Comment{Cell: cell, Author: "CourseMate", Text: items[i].title + "\n" + date(items[i].at)}); err != nil {
			return err
		}
	}
	if err := registerRows(f, name, 6, len(d.students)); err != nil {
		return err
	}
	for i, st := range d.students {
		row := i + 6
		values := make([]any, last)
		values[0], values[1], values[3] = st.Username, st.DisplayName, d.class.Name
		for j := page * 16; j < min(len(items), (page+1)*16); j++ {
			values[start-1+j-page*16] = items[j].value(st)
		}
		if score, ok := d.score(st.ID, kind); ok {
			values[last-1] = rounded(score)
		}
		for col, value := range values {
			// Nil entries are the covered cells of merged name/class fields.
			if value != nil {
				if err := f.SetCellValue(name, cellAt(col+1, row), value); err != nil {
					return err
				}
			}
		}
	}
	if err := registerNumberFormat(f, name, cellAt(last, 6), cellAt(last, max(6, len(d.students)+5)), "0.00"); err != nil {
		return err
	}
	return registerPrint(f, name, 6, last, len(d.students), "landscape")
}
