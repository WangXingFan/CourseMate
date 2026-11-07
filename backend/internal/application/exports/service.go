package exports

import (
	"context"
	"errors"
	"fmt"
	"math"
	"time"

	classroomapp "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/application/classroom"
	attendance "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/attendance"
	class "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/classroom"
	lab "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/labassessment"
	user "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/user"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/repository"
)

type userReader interface {
	GetByID(context.Context, uint) (*user.User, error)
}
type Service struct {
	classes    repository.ClassroomRepository
	labs       repository.LabAssessmentRepository
	attendance repository.AttendanceRepository
	learning   repository.LearningVirtualLabRepository
	users      userReader
	now        func() time.Time
}

func NewService(c repository.ClassroomRepository, l repository.LabAssessmentRepository, a repository.AttendanceRepository, v repository.LearningVirtualLabRepository, u userReader) *Service {
	return &Service{c, l, a, v, u, time.Now}
}

type Options struct {
	AIActivity          class.AIActivityOptions
	PerformanceRecordID string
	Kind                string
	IncludeOngoing      bool
	Weights             map[string]float64
	FilenameTemplate    string
	CourseID            string
}
type File struct {
	Name, ContentType string
	Data              []byte
}
type homeworkData struct {
	item        class.Homework
	submissions map[uint]class.HomeworkSubmission
}
type labData struct {
	item   lab.Assignment
	states map[uint]lab.State
}
type attendanceData struct {
	item    attendance.Session
	records map[uint]attendance.Record
}
type dataset struct {
	recordTitle      string
	aiActivity       *class.AIActivityReport
	performance      *class.PerformanceReport
	performanceTitle string
	class            class.Classroom
	students         []class.Student
	homeworks        []homeworkData
	labs             []labData
	attendance       []attendanceData
	now              time.Time
}

func (o Options) validate() error {
	switch o.Kind {
	case "homeworks", "labs", "attendance", "performance", "ai_activity":
		return nil
	case "reports":
		if len(lab.TaskIDs(o.CourseID)) == 0 {
			return ErrInvalid
		}
		return nil
	case "summary":
	default:
		return ErrInvalid
	}
	var total float64
	for k, w := range o.Weights {
		if (k != "homeworks" && k != "labs" && k != "attendance" && k != "performance" && k != "ai_activity") || math.IsNaN(w) || math.IsInf(w, 0) || w <= 0 || w > 100 {
			return ErrInvalid
		}
		total += w
	}
	if math.Abs(total-100) > 0.000001 {
		return ErrInvalid
	}
	return nil
}
func (s *Service) ownedClassroom(ctx context.Context, actor uint, id string) (*class.Classroom, error) {
	u, err := s.users.GetByID(ctx, actor)
	if err != nil {
		return nil, err
	}
	if u == nil || u.Role != user.RoleTeacher || u.Status != user.StatusActive {
		return nil, ErrForbidden
	}
	c, err := s.classes.GetOwnedClassroom(ctx, id, actor)
	if errors.Is(err, repository.ErrNotFound) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return c, nil
}

func (s *Service) loadDataset(ctx context.Context, actor uint, id string, o Options) (*dataset, error) {
	c, err := s.ownedClassroom(ctx, actor, id)
	if err != nil {
		return nil, err
	}
	if err = o.validate(); err != nil {
		return nil, err
	}
	d := dataset{class: *c, now: s.now()}
	d.students, err = s.classes.ListClassroomStudents(ctx, c.ID)
	if err != nil {
		return nil, err
	}
	if o.Kind == "performance" || o.Kind == "summary" && o.Weights["performance"] > 0 {
		service := classroomapp.NewService(s.classes, s.users)
		if o.PerformanceRecordID != "" {
			record, readErr := service.PerformanceRecord(ctx, actor, id, o.PerformanceRecordID)
			if errors.Is(readErr, classroomapp.ErrNotFound) {
				return nil, ErrNotFound
			}
			if readErr != nil {
				return nil, readErr
			}
			d.performance, d.performanceTitle = &record.Report, record.Title
			// A saved assessment retains its roster, including students who later left.
			joined := map[uint]time.Time{}
			for _, st := range d.students {
				joined[st.ID] = st.JoinedAt
			}
			d.students = []class.Student{}
			for _, row := range record.Report.Students {
				if !row.JoinedAt.IsZero() {
					joined[row.UserID] = row.JoinedAt
				}
				d.students = append(d.students, class.Student{ID: row.UserID, PublicID: row.StudentID, Username: row.Username, DisplayName: row.Name, JoinedAt: joined[row.UserID]})
			}
		} else {
			d.performance, err = service.Performance(ctx, actor, id, class.PerformanceOptions{})
			if err != nil {
				return nil, err
			}
			d.performanceTitle = "当前累计预览（未定稿）"
		}
	}
	if err = s.collect(ctx, &d, o); err != nil {
		return nil, fmt.Errorf("export classroom %s: %w", id, err)
	}
	return &d, nil
}

func (s *Service) Export(ctx context.Context, actor uint, id string, o Options) (*File, error) {
	d, err := s.loadDataset(ctx, actor, id, o)
	if err != nil {
		return nil, err
	}
	if o.Kind == "reports" {
		return s.reports(ctx, *d, o)
	}
	return workbook(*d, o)
}

func (s *Service) collect(ctx context.Context, d *dataset, o Options) error {
	needed := func(k string) bool { return o.Kind == k || o.Kind == "summary" && o.Weights[k] > 0 }
	if needed("ai_activity") {
		var err error
		d.aiActivity, err = classroomapp.NewService(s.classes, s.users).AIActivity(ctx, d.class.TeacherID, d.class.PublicID, o.AIActivity)
		if errors.Is(err, classroomapp.ErrInvalid) {
			return ErrInvalid
		}
		if err != nil {
			return err
		}
	}
	if needed("homeworks") {
		items, err := s.classes.ListHomeworks(ctx, d.class.ID)
		if err != nil {
			return err
		}
		for _, item := range items {
			if item.StartsAt.After(d.now) || !o.IncludeOngoing && item.Deadline.After(d.now) {
				continue
			}
			subs, err := s.classes.ListHomeworkSubmissions(ctx, item.ID, 0)
			if err != nil {
				return err
			}
			row := homeworkData{item, map[uint]class.HomeworkSubmission{}}
			for _, sub := range subs {
				row.submissions[sub.StudentID] = sub
			}
			d.homeworks = append(d.homeworks, row)
		}
	}
	if needed("labs") || o.Kind == "reports" {
		items, err := s.labs.List(ctx, d.class.PublicID)
		if err != nil {
			return err
		}
		for _, item := range items {
			if o.Kind == "reports" && item.CourseID != o.CourseID {
				continue
			}
			if item.StartsAt.After(d.now) || o.Kind != "reports" && !o.IncludeOngoing && !item.Final(d.now) {
				continue
			}
			states, err := s.labs.States(ctx, item.ID)
			if err != nil {
				return err
			}
			row := labData{item, map[uint]lab.State{}}
			for _, state := range states {
				row.states[state.UserID] = state
			}
			d.labs = append(d.labs, row)
		}
	}
	if needed("attendance") {
		items, err := s.attendance.List(ctx, d.class.ID)
		if err != nil {
			return err
		}
		for _, item := range items {
			// Ongoing attendance never incurs absence penalties.
			if item.StartsAt.After(d.now) || item.Open(d.now) {
				continue
			}
			records, err := s.attendance.Records(ctx, item.ID)
			if err != nil {
				return err
			}
			row := attendanceData{item, map[uint]attendance.Record{}}
			for _, record := range records {
				row.records[record.StudentID] = record
			}
			d.attendance = append(d.attendance, row)
		}
	}
	return nil
}

func labScore(state lab.State, course string) (score float64, completed int) {
	for _, id := range lab.TaskIDs(course) {
		t := state.Tasks[id]
		if t == nil {
			continue
		}
		_, _, _, value := t.Scores()
		score += value
		for _, a := range t.Attempts {
			if a.SubmittedAt != nil && a.Result != nil {
				completed++
				break
			}
		}
	}
	return
}

type attendanceScore struct{ Present, Late, Absent, Excused int }

func (a attendanceScore) count() int     { return a.Present + a.Late + a.Absent + a.Excused }
func (a attendanceScore) score() float64 { return math.Max(0, 100-float64(a.Late*10+a.Absent*20)) }
func (d dataset) attendanceScore(id uint) attendanceScore {
	var a attendanceScore
	for _, item := range d.attendance {
		switch item.records[id].Status {
		case "present":
			a.Present++
		case "late":
			a.Late++
		case "absent":
			a.Absent++
		case "excused":
			a.Excused++
		}
	}
	return a
}
func (d dataset) score(id uint, kind string) (float64, bool) {
	var total float64
	var joinedAt time.Time
	for _, st := range d.students {
		if st.ID == id {
			joinedAt = st.JoinedAt
			break
		}
	}
	switch kind {
	case "ai_activity":
		if d.aiActivity != nil {
			for _, row := range d.aiActivity.Students {
				if row.UserID == id && row.Final != nil {
					return *row.Final, true
				}
			}
		}
		return 0, false
	case "performance":
		if d.performance != nil {
			for _, row := range d.performance.Students {
				if row.UserID == id && row.Final != nil {
					return *row.Final, true
				}
			}
		}
		return 0, false
	case "homeworks":
		count := 0
		for _, h := range d.homeworks {
			if _, submitted := h.submissions[id]; !submitted && !h.item.AppliesTo(joinedAt) {
				continue
			}
			if h.item.Total() > 0 {
				total += float64(h.submissions[id].Score) / float64(h.item.Total()) * 100
				count++
			}
		}
		if count == 0 {
			return 0, false
		}
		return total / float64(count), true
	case "labs":
		count := 0
		for _, l := range d.labs {
			if len(l.states[id].Tasks) == 0 && !l.item.AppliesTo(joinedAt) {
				continue
			}
			value, _ := labScore(l.states[id], l.item.CourseID)
			total += value
			count++
		}
		if count == 0 {
			return 0, false
		}
		return total / float64(count), true
	case "attendance":
		a := d.attendanceScore(id)
		return a.score(), a.count() > 0
	}
	return 0, false
}
func rounded(v float64) float64 { return math.Round(v*100) / 100 }
