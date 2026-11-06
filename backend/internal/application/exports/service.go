package exports

import (
	"context"
	"errors"
	"fmt"
	"math"
	"time"

	attendance "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/attendance"
	class "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/classroom"
	lab "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/labassessment"
	user "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/user"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/repository"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/shared/apperr"
)

var (
	ErrInvalid   = apperr.New("exports.invalid", "invalid export options")
	ErrForbidden = apperr.New("exports.forbidden", "export access denied")
	ErrNotFound  = apperr.New("exports.not_found", "classroom not found")
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
	Kind             string             `json:"kind"`
	IncludeOngoing   bool               `json:"includeOngoing"`
	Weights          map[string]float64 `json:"weights"`
	FilenameTemplate string             `json:"filenameTemplate"`
	CourseID         string             `json:"courseID"`
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
	class      class.Classroom
	students   []class.Student
	homeworks  []homeworkData
	labs       []labData
	attendance []attendanceData
	now        time.Time
}

func (o Options) validate() error {
	switch o.Kind {
	case "homeworks", "labs", "attendance":
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
		if (k != "homeworks" && k != "labs" && k != "attendance") || math.IsNaN(w) || math.IsInf(w, 0) || w <= 0 || w > 100 {
			return ErrInvalid
		}
		total += w
	}
	if math.Abs(total-100) > 0.000001 {
		return ErrInvalid
	}
	return nil
}
func (s *Service) Export(ctx context.Context, actor uint, id string, o Options) (*File, error) {
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
	if err = o.validate(); err != nil {
		return nil, err
	}
	d := dataset{class: *c, now: s.now()}
	d.students, err = s.classes.ListClassroomStudents(ctx, c.ID)
	if err != nil {
		return nil, err
	}
	if err = s.collect(ctx, &d, o); err != nil {
		return nil, fmt.Errorf("export classroom %s: %w", id, err)
	}
	if o.Kind == "reports" {
		return s.reports(ctx, d, o)
	}
	return workbook(d, o)
}

func (s *Service) collect(ctx context.Context, d *dataset, o Options) error {
	needed := func(k string) bool { return o.Kind == k || o.Kind == "summary" && o.Weights[k] > 0 }
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
	switch kind {
	case "homeworks":
		if len(d.homeworks) == 0 {
			return 0, false
		}
		for _, h := range d.homeworks {
			if h.item.Total() > 0 {
				total += float64(h.submissions[id].Score) / float64(h.item.Total()) * 100
			}
		}
		return total / float64(len(d.homeworks)), true
	case "labs":
		if len(d.labs) == 0 {
			return 0, false
		}
		for _, l := range d.labs {
			value, _ := labScore(l.states[id], l.item.CourseID)
			total += value
		}
		return total / float64(len(d.labs)), true
	case "attendance":
		a := d.attendanceScore(id)
		return a.score(), a.count() > 0
	}
	return 0, false
}
func rounded(v float64) float64 { return math.Round(v*100) / 100 }
