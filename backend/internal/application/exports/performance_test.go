package exports

import (
	"bytes"
	"context"
	"testing"
	"time"

	class "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/classroom"
	user "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/user"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/repository"
	"github.com/xuri/excelize/v2"
)

type performanceClasses struct {
	fakeClasses
	record   class.PerformanceRecord
	quizzes  []class.Quiz
	quizSubs map[uint][]class.QuizSubmission
}

func (f performanceClasses) GetPerformanceRecord(_ context.Context, c uint, id string) (*class.PerformanceRecord, error) {
	if c != f.record.ClassroomID || id != f.record.ID {
		return nil, repository.ErrNotFound
	}
	copy := f.record
	return &copy, nil
}
func (f performanceClasses) ListQuizzes(context.Context, uint) ([]class.Quiz, error) {
	return f.quizzes, nil
}
func (f performanceClasses) ListQuizSubmissions(_ context.Context, id uint) ([]class.QuizSubmission, error) {
	return f.quizSubs[id], nil
}

func TestPerformanceExportUsesFinalizedScoresRosterAndOptionalSummary(t *testing.T) {
	v := 87.5
	c := performanceClasses{fakeClasses: fakeClasses{owner: 7}, record: class.PerformanceRecord{ID: "record", ClassroomID: 1, Title: "期中", Report: class.PerformanceReport{Version: class.PerformanceVersion, Conversion: "small_class", Students: []class.PerformanceStudent{{UserID: 1, StudentID: "s", Username: "001", Name: "=学生", Final: &v, Raw: &v, Status: "assessed", Stages: []class.PerformanceStage{{Phase: "pre_class"}, {Phase: "in_class"}, {Phase: "after_class"}}}}}}}
	s := NewService(c, nil, nil, nil, fakeUsers{user.RoleTeacher})
	for _, kind := range []string{"performance", "summary"} {
		file, err := s.Export(context.Background(), 7, "class", Options{Kind: kind, PerformanceRecordID: "record", Weights: map[string]float64{"performance": 100}})
		if err != nil {
			t.Fatal(err)
		}
		x, err := excelize.OpenReader(bytes.NewReader(file.Data))
		if err != nil {
			t.Fatal(err)
		}
		rows, err := x.GetRows("课堂成绩")
		if err != nil {
			t.Fatal(err)
		}
		if len(rows) != 2 || rows[1][0] != "001" || rows[1][21] != "87.5" {
			t.Fatalf("saved roster and score: %#v", rows)
		}
		if formula, _ := x.GetCellFormula("课堂成绩", "B2"); formula != "" {
			t.Fatal("name became formula")
		}
		if kind == "summary" {
			rows, err = x.GetRows("综合成绩")
			if err != nil || rows[1][5] != "87.5" {
				t.Fatalf("summary %v %#v", err, rows)
			}
		}
		x.Close()
	}
}

func TestPerformanceExportExcludesOngoingAndPreservesNoData(t *testing.T) {
	closed := time.Now().Add(-time.Hour)
	c := performanceClasses{fakeClasses: fakeClasses{owner: 7, students: []class.Student{{ID: 1, Username: "001"}, {ID: 2, Username: "002", JoinedAt: time.Now()}}}, quizzes: []class.Quiz{{ID: 1, PublicID: "closed", Status: class.QuizStatusClosed, Phase: class.QuizPhasePreClass, ClosedAt: &closed, Questions: []class.QuizQuestion{{ID: "q", Options: []string{"A", "B"}, Answer: 0}}}, {ID: 2, PublicID: "open", Status: class.QuizStatusOpen}}, quizSubs: map[uint][]class.QuizSubmission{1: {{StudentID: 1, Answers: []int{0}}}}}
	s := NewService(c, nil, nil, nil, fakeUsers{user.RoleTeacher})
	file, err := s.Export(context.Background(), 7, "class", Options{Kind: "summary", IncludeOngoing: true, Weights: map[string]float64{"performance": 100}})
	if err != nil {
		t.Fatal(err)
	}
	x, err := excelize.OpenReader(bytes.NewReader(file.Data))
	if err != nil {
		t.Fatal(err)
	}
	defer x.Close()
	rows, err := x.GetRows("综合成绩")
	if err != nil {
		t.Fatal(err)
	}
	if rows[1][5] != "100" || rows[2][5] != "" {
		t.Fatalf("ongoing or no-data scores: %#v", rows)
	}
}
