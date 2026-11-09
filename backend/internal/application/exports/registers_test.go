package exports

import (
	"bytes"
	"fmt"
	"os"
	"path/filepath"
	"slices"
	"strings"
	"testing"
	"time"

	attendance "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/attendance"
	class "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/classroom"
	lab "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/labassessment"
	"github.com/xuri/excelize/v2"
)

func TestArchiveRegistersKeepSchoolLayoutAndCurrentScores(t *testing.T) {
	now := time.Date(2026, 11, 9, 12, 0, 0, 0, beijing)
	performanceScore, aiScore := 87.5, 50.0
	d := dataset{
		profile: class.ExportProfile{AcademicTerm: "2026-2027-1", CourseCode: "TEST101", CourseName: "示例课程", TeacherName: "示例教师", College: "示例学院", TeachingLocation: "示例教室"},
		class:   class.Classroom{Name: "示例班级", TeacherName: "示例教师"}, now: now,
		performance: &class.PerformanceReport{},
		aiActivity:  &class.AIActivityReport{StartDate: "2026-09-01", EndDate: "2026-11-08"},
	}
	for i := 1; i <= 30; i++ {
		d.students = append(d.students, class.Student{ID: uint(i), Username: fmt.Sprintf("002026%05d", i), DisplayName: fmt.Sprintf("示例学生%02d", i)})
	}
	d.students[0].DisplayName = "=同学"
	// Later enrollment is blank, while an eligible student without work gets zero.
	d.students[1].JoinedAt = now
	d.performance.Students = []class.PerformanceStudent{{UserID: 1, Username: d.students[0].Username, Name: d.students[0].DisplayName, Final: &performanceScore, Reason: "教师更正", Stages: []class.PerformanceStage{{}, {}, {}}}}
	d.aiActivity.Students = []class.AIActivityStudent{{UserID: 1, Username: d.students[0].Username, Name: d.students[0].DisplayName, Final: &aiScore}}
	for i := 0; i < 6; i++ {
		d.homeworks = append(d.homeworks, homeworkData{item: class.Homework{Title: fmt.Sprintf("作业%d", i+1), StartsAt: now.AddDate(0, 0, -30+i), Deadline: now.Add(-time.Hour), Questions: []class.HomeworkQuestion{{Points: 3}}}, submissions: map[uint]class.HomeworkSubmission{1: {Score: 2}}})
	}
	for i := 1; i <= 3; i++ {
		course := fmt.Sprintf("L%d", i)
		end := now.Add(-time.Hour)
		d.labs = append(d.labs, labData{item: lab.Assignment{CourseID: course, Deadline: &end}, states: map[uint]lab.State{1: {Tasks: map[string]*lab.TaskState{course + "-1": {Correction: &lab.Correction{Score: 23}}}}}})
	}
	for i := 0; i < 17; i++ {
		at := now.AddDate(0, 0, -18+i)
		status := "present"
		if i == 0 {
			status = "late"
		} else if i == 16 {
			status = "absent"
		}
		d.attendance = append(d.attendance, attendanceData{item: attendance.Session{Title: fmt.Sprintf("签到%d", i+1), StartsAt: at}, records: map[uint]attendance.Record{1: {Status: status}}})
		id := fmt.Sprintf("quiz-%d", i)
		d.performance.Activities = append(d.performance.Activities, class.PerformanceActivity{ID: id, Title: fmt.Sprintf("课堂活动%d", i+1), ClosedAt: at})
		d.performance.Students[0].Evidence = append(d.performance.Students[0].Evidence, class.PerformanceEvidence{QuizID: id, Points: 1, Total: 2})
	}
	o := Options{Kind: "summary", Weights: map[string]float64{"homeworks": 30, "labs": 40, "attendance": 10, "performance": 10, "ai_activity": 10}}
	file, err := workbook(d, o)
	if err != nil {
		t.Fatal(err)
	}
	f, err := excelize.OpenReader(bytes.NewReader(file.Data))
	if err != nil {
		t.Fatal(err)
	}
	defer f.Close()
	check := func(sheet, cell, want string) {
		t.Helper()
		got, err := f.GetCellValue(sheet, cell, excelize.Options{RawCellValue: true})
		if err != nil || got != want {
			t.Fatalf("%s!%s = %q, want %q (%v)", sheet, cell, got, want, err)
		}
	}
	if f.GetSheetList()[0] != "课程过程考核成绩登记表" {
		t.Fatal("the printable register must open first")
	}
	check("课程过程考核成绩登记表", "A1", "课程过程考核成绩登记表")
	check("课程过程考核成绩登记表", "A2", "学年学期：2026-2027-1    课程代码：TEST101    课程名称：示例课程")
	check("课程过程考核成绩登记表", "A3", "教师姓名：示例教师    所属学院：示例学院    上课教室：示例教室")
	check("学生考勤登记表", "J2", "TEST101")
	check("学生考勤登记表（2）", "Q3", "示例教室")
	check("课堂成绩登记表", "P2", "示例课程")
	check("课堂成绩登记表（2）", "I3", "示例学院")
	check("AI活跃度成绩登记表", "A3", "教师姓名：示例教师    所属学院：示例学院    上课教室：示例教室")
	check("课程过程考核成绩登记表", "E5", "作业成绩")
	check("课程过程考核成绩登记表", "I5", "AI活跃度")
	check("课程过程考核成绩登记表", "E6", "0.3")
	check("课程过程考核成绩登记表", "B8", "00202600001")
	check("课程过程考核成绩登记表", "C8", "=同学")
	check("课程过程考核成绩登记表", "J8", "49.95")
	check("课程过程考核成绩登记表", "J9", "")
	check("课程过程考核成绩登记表", "B37", "00202600030")
	check("作业成绩登记表", "J5", "作业6")
	check("作业成绩登记表", "K8", "66.67")
	check("作业成绩登记表", "K9", "")
	check("作业成绩登记表", "K10", "0")
	check("实验成绩登记表", "G5", "实验三")
	check("实验成绩登记表", "H8", "23")
	check("学生考勤登记表", "B6", "=同学")
	check("学生考勤登记表", "D6", "示例班级")
	check("学生考勤登记表", "F6", "○")
	check("学生考勤登记表", "F7", "—")
	check("学生考勤登记表（2）", "F6", "×")
	check("学生考勤登记表（2）", "V6", "70")
	check("课堂成绩登记表", "E6", "50")
	check("课堂成绩登记表（2）", "E6", "50")
	check("课堂成绩登记表", "U6", "87.5")
	check("AI活跃度成绩登记表", "E6", "50")
	for _, name := range []string{"综合成绩", "作业成绩明细", "实验成绩明细", "签到考勤明细", "课堂答题依据", "AI活跃度周明细", "导出说明"} {
		if !slices.Contains(f.GetSheetList(), name) {
			t.Fatalf("missing evidence %s", name)
		}
	}
	for _, name := range f.GetSheetList() {
		if strings.Contains(name, "课前视频") {
			t.Fatal("included a category outside CourseMate")
		}
	}
	for _, cell := range []string{"J8", "J9"} {
		formula, err := f.GetCellFormula("课程过程考核成绩登记表", cell)
		if err != nil || !strings.Contains(formula, "SUMPRODUCT") {
			t.Fatalf("missing weighted formula: %s %v", formula, err)
		}
		got, err := f.CalcCellValue("课程过程考核成绩登记表", cell)
		want := "49.95"
		if cell == "J9" {
			want = ""
		}
		if err != nil || got != want {
			t.Fatalf("recalculated %s = %s, want %s (%v)", cell, got, want, err)
		}
	}
	if formula, _ := f.GetCellFormula("课程过程考核成绩登记表", "C8"); formula != "" {
		t.Fatal("name was treated as a formula")
	}
	merges, err := f.GetMergeCells("课程过程考核成绩登记表")
	if err != nil {
		t.Fatal(err)
	}
	wantMerges := map[string]bool{"A1:K1": false, "A5:D5": false, "A6:D6": false, "J5:J6": false, "K5:K7": false}
	for _, merge := range merges {
		wantMerges[merge.GetStartAxis()+":"+merge.GetEndAxis()] = true
	}
	for name, found := range wantMerges {
		if !found {
			t.Fatalf("missing school layout merge %s", name)
		}
	}
	styleID, _ := f.GetCellStyle("课程过程考核成绩登记表", "A1")
	style, _ := f.GetStyle(styleID)
	if style.Font.Family != "宋体" || style.Font.Size != 16 || !style.Font.Bold {
		t.Fatalf("unexpected school title font: %+v", style.Font)
	}
	page, err := f.GetPageLayout("课程过程考核成绩登记表")
	if err != nil || *page.Size != 9 || *page.Orientation != "landscape" || *page.FitToWidth != 1 || *page.FitToHeight != 1 {
		t.Fatalf("print layout: %+v %v", page, err)
	}
	// Optional local sample generated by the real exporter, using only synthetic data.
	if dir := os.Getenv("COURSEMATE_EXPORT_PREVIEW_DIR"); dir != "" {
		if err := os.MkdirAll(dir, 0755); err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(filepath.Join(dir, "归档模板示例.xlsx"), file.Data, 0644); err != nil {
			t.Fatal(err)
		}
	}
}

func TestArchiveRegistersIncludeOnlyRequestedCategoriesAndEmptyRoster(t *testing.T) {
	for _, kind := range []string{"summary", "homeworks", "labs", "attendance", "performance", "ai_activity"} {
		t.Run(kind, func(t *testing.T) {
			o := Options{Kind: kind, Weights: map[string]float64{"homeworks": 100}}
			file, err := workbook(dataset{class: class.Classroom{Name: "空班级"}}, o)
			if err != nil {
				t.Fatal(err)
			}
			f, err := excelize.OpenReader(bytes.NewReader(file.Data))
			if err != nil {
				t.Fatal(err)
			}
			defer f.Close()
			for key, name := range registerNames {
				want := key == kind || kind == "summary" && key == "homeworks"
				if slices.Contains(f.GetSheetList(), name) != want {
					t.Fatalf("unexpected category %s for %s", key, kind)
				}
			}
			if kind == "summary" {
				value, _ := f.GetCellValue(registerNames[kind], "F5")
				if value != "合计" {
					t.Fatalf("single-category total moved to wrong column: %s", value)
				}
			}
		})
	}
}
