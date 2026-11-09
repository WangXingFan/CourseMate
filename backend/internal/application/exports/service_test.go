package exports

import (
	"archive/zip"
	"bytes"
	"context"
	"errors"
	"io"
	"strings"
	"testing"
	"time"

	attendance "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/attendance"
	class "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/classroom"
	lab "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/labassessment"
	learning "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/learning"
	user "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/user"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/repository"
	"github.com/xuri/excelize/v2"
)

type fakeUsers struct{ role string }

func (f fakeUsers) GetByID(context.Context, uint) (*user.User, error) {
	return &user.User{Role: f.role, Status: user.StatusActive}, nil
}

type fakeClasses struct {
	repository.ClassroomRepository
	owner       uint
	students    []class.Student
	homeworks   []class.Homework
	submissions []class.HomeworkSubmission
}

func (f fakeClasses) GetOwnedClassroom(_ context.Context, _ string, actor uint) (*class.Classroom, error) {
	if actor != f.owner {
		return nil, repository.ErrNotFound
	}
	return &class.Classroom{ID: 1, PublicID: "class", TeacherID: actor, Name: "信号班"}, nil
}
func (f fakeClasses) ListClassroomStudents(context.Context, uint) ([]class.Student, error) {
	return f.students, nil
}
func (f fakeClasses) ListHomeworks(context.Context, uint) ([]class.Homework, error) {
	return f.homeworks, nil
}
func (f fakeClasses) ListHomeworkSubmissions(context.Context, uint, uint) ([]class.HomeworkSubmission, error) {
	return f.submissions, nil
}

type fakeLabs struct {
	repository.LabAssessmentRepository
	assignments []lab.Assignment
	states      []lab.State
}

func (f fakeLabs) List(context.Context, string) ([]lab.Assignment, error) { return f.assignments, nil }
func (f fakeLabs) States(context.Context, string) ([]lab.State, error)    { return f.states, nil }

type fakeAttendance struct {
	repository.AttendanceRepository
	sessions []attendance.Session
	records  map[string][]attendance.Record
}

func (f fakeAttendance) List(context.Context, uint) ([]attendance.Session, error) {
	return f.sessions, nil
}
func (f fakeAttendance) Records(_ context.Context, id string) ([]attendance.Record, error) {
	return f.records[id], nil
}

type fakeLearning struct {
	repository.LearningVirtualLabRepository
}

func (f fakeLearning) GetVirtualLab(context.Context, uint) (*learning.VirtualLab, error) {
	return &learning.VirtualLab{}, nil
}

func TestExportAuthorizationAndWeights(t *testing.T) {
	classes := fakeClasses{owner: 7}
	s := NewService(classes, nil, nil, nil, fakeUsers{user.RoleStudent})
	if _, err := s.Export(context.Background(), 7, "class", Options{Kind: "homeworks"}); !errors.Is(err, ErrForbidden) {
		t.Fatalf("student: %v", err)
	}
	s.users = fakeUsers{user.RoleTeacher}
	if _, err := s.Export(context.Background(), 8, "class", Options{Kind: "homeworks"}); !errors.Is(err, ErrNotFound) {
		t.Fatalf("other teacher: %v", err)
	}
	if _, err := s.Export(context.Background(), 7, "class", Options{Kind: "summary", Weights: map[string]float64{"labs": 90}}); !errors.Is(err, ErrInvalid) {
		t.Fatalf("weights: %v", err)
	}
}

func TestMakeupWindowDefersHomeworkGradeFinalization(t *testing.T) {
	now := time.Date(2026, 11, 9, 12, 0, 0, 0, time.UTC)
	classes := fakeClasses{owner: 7, students: []class.Student{{ID: 1}}, homeworks: []class.Homework{{
		ID: 1, StartsAt: now.Add(-2 * time.Hour), Deadline: now.Add(-time.Hour),
		Questions:       []class.HomeworkQuestion{{Points: 100}},
		DeadlineChanges: []class.HomeworkDeadlineChange{{StudentID: 1, Deadline: now.Add(time.Hour)}},
	}}, submissions: []class.HomeworkSubmission{{StudentID: 1, Score: 80, Makeup: true}}}
	s := NewService(classes, nil, nil, nil, fakeUsers{user.RoleTeacher})
	s.now = func() time.Time { return now }
	options := Options{Kind: "summary", Weights: map[string]float64{"homeworks": 100}}
	preview, err := s.PreviewGrades(t.Context(), 7, "class", options)
	if err != nil {
		t.Fatal(err)
	}
	if preview.Students[0].Final != nil {
		t.Fatal("unfinished makeup window entered final grade")
	}
	now = now.Add(time.Hour)
	closed, err := s.PreviewGrades(t.Context(), 7, "class", options)
	if err != nil {
		t.Fatal(err)
	}
	if closed.Students[0].Final == nil || *closed.Students[0].Final != 80 {
		t.Fatal("makeup grade missing after final deadline")
	}
	if closed.Fingerprint == preview.Fingerprint {
		t.Fatal("deadline change left a stale preview valid")
	}
}

func TestEnrollmentEligibilityAndPriorEvidence(t *testing.T) {
	joined := time.Date(2026, 11, 5, 12, 0, 0, 0, time.UTC)
	before, after := joined.Add(-time.Hour), joined.Add(time.Hour)
	for _, tc := range []struct {
		name               string
		deadline, closedAt *time.Time
		open, eligible     bool
	}{
		{"deadline before joining", &before, nil, true, false},
		{"deadline at joining", &joined, nil, true, false},
		{"available after joining", &after, nil, true, true},
		{"manual closure before joining", &after, &before, false, false},
		{"closure at joining", nil, &joined, false, false},
		{"deadline before later closure", &before, &after, false, false},
		{"reopened", &after, &before, true, true},
		{"legacy unknown closure", nil, nil, false, true},
	} {
		t.Run(tc.name, func(t *testing.T) {
			a := lab.Assignment{CourseID: "L1", Deadline: tc.deadline, ClosedAt: tc.closedAt, Open: tc.open}
			if a.AppliesTo(joined) != tc.eligible {
				t.Fatal("incorrect lab eligibility")
			}
			d := dataset{students: []class.Student{{ID: 1, JoinedAt: joined}}, labs: []labData{{item: a, states: map[uint]lab.State{}}}}
			if _, ok := d.score(1, "labs"); ok != tc.eligible {
				t.Fatal("incorrect lab denominator")
			}
			d.labs[0].states[1] = lab.State{Tasks: map[string]*lab.TaskState{"L1-1": {Correction: &lab.Correction{Score: 23}}}}
			if value, ok := d.score(1, "labs"); !ok || value != 23 {
				t.Fatalf("prior lab evidence lost: %v %v", value, ok)
			}
		})
	}
	d := dataset{students: []class.Student{{ID: 1, JoinedAt: joined}}, homeworks: []homeworkData{{item: class.Homework{Deadline: joined, Questions: []class.HomeworkQuestion{{Points: 100}}}, submissions: map[uint]class.HomeworkSubmission{}}}}
	if _, ok := d.score(1, "homeworks"); ok {
		t.Fatal("deadline at joining counted as missing submission")
	}
	d.homeworks[0].submissions[1] = class.HomeworkSubmission{Score: 80}
	if value, ok := d.score(1, "homeworks"); !ok || value != 80 {
		t.Fatal("prior homework evidence lost")
	}
	d.homeworks = append(d.homeworks, homeworkData{item: class.Homework{Deadline: after, Questions: []class.HomeworkQuestion{{Points: 100}}}})
	if value, ok := d.score(1, "homeworks"); !ok || value != 40 {
		t.Fatal("eligible missing submission was not zero")
	}
}

func TestSummaryScoringAndAttendanceRoster(t *testing.T) {
	now := time.Date(2026, 11, 5, 12, 0, 0, 0, time.UTC)
	before, after := now.Add(-time.Hour), now.Add(time.Hour)
	classes := fakeClasses{owner: 7, students: []class.Student{{ID: 1, Username: "00123", DisplayName: "=同学"}, {ID: 2, Username: "00234", DisplayName: "缺交"}, {ID: 3, Username: "00345", DisplayName: "后来加入"}}, homeworks: []class.Homework{{ID: 1, Title: "作业", StartsAt: before, Deadline: before, Questions: []class.HomeworkQuestion{{Points: 50}}}, {ID: 2, StartsAt: before, Deadline: after}}, submissions: []class.HomeworkSubmission{{StudentID: 1, Score: 40, SubmittedAt: before}}}
	state := lab.State{UserID: 1, Tasks: map[string]*lab.TaskState{"L1-1": {Correction: &lab.Correction{Score: 23}}}}
	labs := fakeLabs{assignments: []lab.Assignment{{ID: "lab", CourseID: "L1", StartsAt: before, Open: false}}, states: []lab.State{state}}
	attendanceRepo := fakeAttendance{records: map[string][]attendance.Record{}}
	for _, id := range []string{"a", "b", "c", "d", "e", "f", "g"} {
		attendanceRepo.sessions = append(attendanceRepo.sessions, attendance.Session{ID: id, StartsAt: before, EndsAt: before})
		attendanceRepo.records[id] = []attendance.Record{{StudentID: 2, Status: "absent"}}
	}
	attendanceRepo.records["a"] = append(attendanceRepo.records["a"], attendance.Record{StudentID: 1, Status: "late"})
	attendanceRepo.records["b"] = append(attendanceRepo.records["b"], attendance.Record{StudentID: 1, Status: "absent"})
	attendanceRepo.records["c"] = append(attendanceRepo.records["c"], attendance.Record{StudentID: 1, Status: "excused"})
	attendanceRepo.sessions = append(attendanceRepo.sessions, attendance.Session{ID: "ongoing", StartsAt: before, EndsAt: after})
	attendanceRepo.records["ongoing"] = []attendance.Record{{StudentID: 1, Status: "absent"}}
	s := NewService(classes, labs, attendanceRepo, nil, fakeUsers{user.RoleTeacher})
	s.now = func() time.Time { return now }
	f, err := s.Export(context.Background(), 7, "class", Options{Kind: "summary", Weights: map[string]float64{"homeworks": 40, "labs": 40, "attendance": 20}})
	if err != nil {
		t.Fatal(err)
	}
	x, err := excelize.OpenReader(bytes.NewReader(f.Data))
	if err != nil {
		t.Fatal(err)
	}
	defer x.Close()
	rows, err := x.GetRows("综合成绩")
	if err != nil {
		t.Fatal(err)
	}
	// 80*0.4 + 23*0.4 + (100-10-20)*0.2 = 55.2, even when
	// the lab is incomplete. Teacher corrections remain authoritative.
	if rows[1][0] != "00123" || rows[1][1] != "=同学" || rows[1][11] != "55.2" {
		t.Fatalf("first row: %#v", rows[1])
	}
	if formula, _ := x.GetCellFormula("综合成绩", "B2"); formula != "" {
		t.Fatalf("name became formula: %s", formula)
	}
	if rows[2][11] != "0" {
		t.Fatalf("floor and missing submissions: %#v", rows[2])
	}
	if rows[3][11] != "" || !strings.Contains(rows[3][12], "缺少数据") {
		t.Fatalf("no roster: %#v", rows[3])
	}
	_, completed := labScore(state, "L1")
	if completed != 0 {
		t.Fatal("correction must not imply submitted completion")
	}
}

func TestReportArchiveChinesePDFAndSafeUniqueNames(t *testing.T) {
	d := dataset{class: class.Classroom{Name: "信号班"}, now: time.Now(), students: []class.Student{{ID: 1, Username: "001", DisplayName: "张三"}, {ID: 2, Username: "002", DisplayName: "张三"}}}
	s := &Service{learning: fakeLearning{}}
	f, err := s.reports(context.Background(), d, Options{FilenameTemplate: "../{姓名}", CourseID: "L1"})
	if err != nil {
		t.Fatal(err)
	}
	z, err := zip.NewReader(bytes.NewReader(f.Data), int64(len(f.Data)))
	if err != nil {
		t.Fatal(err)
	}
	if len(z.File) != 2 || z.File[0].Name == z.File[1].Name {
		t.Fatalf("archive entries: %#v", z.File)
	}
	for _, entry := range z.File {
		if strings.ContainsAny(entry.Name, "/\\") {
			t.Fatalf("unsafe path %s", entry.Name)
		}
		r, err := entry.Open()
		if err != nil {
			t.Fatal(err)
		}
		data, err := io.ReadAll(r)
		r.Close()
		if err != nil {
			t.Fatal(err)
		}
		if !bytes.HasPrefix(data, []byte("%PDF-")) || !bytes.Contains(data, []byte("/FontFile2")) || !bytes.Contains(data, []byte("/ToUnicode")) {
			t.Fatalf("not an embedded Unicode PDF: %s", entry.Name)
		}
	}
	if _, err := reportName("{未知字段}", d, d.students[0], "L1"); !errors.Is(err, ErrInvalid) {
		t.Fatalf("unknown field: %v", err)
	}
	doc := labDocument{Tasks: map[string]labRecord{"L2-3": {Prediction: "实验二专属预测"}}}
	for _, course := range []string{"L1", "L2"} {
		pdf, err := renderReport(d, d.students[0], doc, course)
		if err != nil {
			t.Fatal(err)
		}
		count := "/Count 1"
		if course == "L2" {
			count = "/Count 2"
		}
		if !bytes.Contains(pdf, []byte(count)) {
			t.Fatalf("%s should only include its own tasks", course)
		}
	}
	if (Options{Kind: "reports", CourseID: "L4"}).validate() == nil {
		t.Fatal("unknown course accepted")
	}
}
