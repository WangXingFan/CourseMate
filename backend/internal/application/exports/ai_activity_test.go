package exports

import (
	"bytes"
	"context"
	"errors"
	"testing"
	"time"

	class "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/classroom"
	user "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/user"
	"github.com/xuri/excelize/v2"
)

type activityExportClasses struct {
	fakeClasses
	events []class.AIActivityEvent
}

func (f activityExportClasses) ListAIActivityEvents(context.Context, []uint, time.Time) ([]class.AIActivityEvent, error) {
	return f.events, nil
}

func TestAIActivityExportServiceCollectsRangeAndChecksAccess(t *testing.T) {
	start := time.Date(2020, 10, 19, 0, 0, 0, 0, class.AIActivityLocation)
	c := activityExportClasses{fakeClasses: fakeClasses{owner: 7, students: []class.Student{{ID: 1, Username: "001", JoinedAt: start}}}, events: []class.AIActivityEvent{{UserID: 1, RootMessageID: 1, QuestionAt: start, At: start}}}
	s := NewService(c, nil, nil, nil, fakeUsers{user.RoleTeacher})
	o := Options{Kind: "ai_activity", AIActivity: class.AIActivityOptions{StartDate: "2020-10-19", EndDate: "2020-10-25"}}
	file, err := s.Export(context.Background(), 7, "class", o)
	if err != nil {
		t.Fatal(err)
	}
	f, err := excelize.OpenReader(bytes.NewReader(file.Data))
	if err != nil {
		t.Fatal(err)
	}
	defer f.Close()
	rows, err := f.GetRows("AI活跃度")
	if err != nil || rows[1][6] != "40" || rows[1][8] != "2020-10-19" || rows[1][9] != "2020-10-25" {
		t.Fatalf("range or score: %+v %v", rows, err)
	}
	if _, err = s.Export(context.Background(), 8, "class", o); !errors.Is(err, ErrNotFound) {
		t.Fatalf("other teacher: %v", err)
	}
	o.AIActivity.EndDate = "bad"
	if _, err = s.Export(context.Background(), 7, "class", o); !errors.Is(err, ErrInvalid) {
		t.Fatalf("invalid dates: %v", err)
	}
	s.users = fakeUsers{user.RoleStudent}
	if _, err = s.Export(context.Background(), 7, "class", o); !errors.Is(err, ErrForbidden) {
		t.Fatalf("student export: %v", err)
	}
}

func TestAIActivityExportAndOptionalSummaryWeight(t *testing.T) {
	start := time.Date(2026, 10, 19, 0, 0, 0, 0, class.AIActivityLocation)
	end := start.AddDate(0, 0, 7)
	students := []class.Student{{ID: 1, Username: "001", DisplayName: "学生", JoinedAt: start}, {ID: 2, Username: "002", JoinedAt: end}}
	report := class.BuildAIActivity("c", students, []class.AIActivityEvent{{UserID: 1, RootMessageID: 1, QuestionAt: start, At: start, LearningSource: "correction"}}, start, end, end)
	d := dataset{class: class.Classroom{Name: "班级"}, students: students, aiActivity: report, now: end}
	for _, kind := range []string{"ai_activity", "summary"} {
		o := Options{Kind: kind, Weights: map[string]float64{"ai_activity": 100}}
		if err := o.validate(); err != nil {
			t.Fatal(err)
		}
		file, err := workbook(d, o)
		if err != nil {
			t.Fatal(err)
		}
		f, err := excelize.OpenReader(bytes.NewReader(file.Data))
		if err != nil {
			t.Fatal(err)
		}
		rows, err := f.GetRows("AI活跃度")
		if err != nil || rows[1][0] != "001" || rows[1][6] != "50" || rows[2][7] != "暂无评价" {
			t.Fatalf("summary rows: %+v %v", rows, err)
		}
		weeks, err := f.GetRows("AI活跃度周明细")
		if err != nil || len(weeks) != 2 || weeks[1][10] != "50" || weeks[1][11] != "40" || weeks[1][14] != "1" || weeks[1][17] != "10" || weeks[1][18] != "10" {
			t.Fatalf("weeks: %+v %v", weeks, err)
		}
		if kind == "summary" {
			rows, err = f.GetRows("综合成绩")
			if err != nil || rows[1][5] != "50" || rows[2][5] != "" {
				t.Fatalf("weighted scores: %+v %v", rows, err)
			}
		}
		_ = f.Close()
	}
	if err := (Options{Kind: "summary", Weights: map[string]float64{"homeworks": 80, "ai_activity": 20}}).validate(); err != nil {
		t.Fatal(err)
	}
	if err := (Options{Kind: "summary", Weights: map[string]float64{"homeworks": 100, "ai_activity": 20}}).validate(); err == nil {
		t.Fatal("invalid weight total accepted")
	}
}
