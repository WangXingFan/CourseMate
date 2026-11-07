package analytics

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	app "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/application/analytics"
	domain "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/analytics"
	classroom "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/classroom"
	lab "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/labassessment"
	learning "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/learning"
	domainuser "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/user"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/infra/persistence/models"
	analyticsrepo "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/infra/persistence/postgres/analytics"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/repository"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/transport/http/middleware"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"net/http/httptest"
	"path/filepath"
	"testing"
	"time"
)

type testUsers map[uint]domainuser.User

func (users testUsers) GetByID(_ context.Context, id uint) (*domainuser.User, error) {
	user, ok := users[id]
	if !ok {
		return nil, repository.ErrNotFound
	}
	return &user, nil
}

func TestUsagePermissionsAndAggregation(t *testing.T) {
	db, err := gorm.Open(sqlite.Open(filepath.Join(t.TempDir(), "usage.db")), &gorm.Config{})
	if err != nil {
		t.Fatal(err)
	}
	connection, err := db.DB()
	if err != nil {
		t.Fatal(err)
	}
	connection.SetMaxOpenConns(1)
	t.Cleanup(func() { _ = connection.Close() })
	if err := db.AutoMigrate(&models.User{}, &models.UsageVisit{}, &models.Classroom{}, &models.ClassroomStudent{}, &models.LearningAttempt{}, &models.LearningLessonAttempt{}, &models.ClassroomHomework{}, &models.ClassroomHomeworkSubmission{}, &models.ClassroomQuiz{}, &models.ClassroomQuizSubmission{}, &models.LabAssessment{}, &models.LabAssessmentState{}); err != nil {
		t.Fatal(err)
	}
	create := func(value any) {
		t.Helper()
		if err := db.Create(value).Error; err != nil {
			t.Fatal(err)
		}
	}
	users := testUsers{}
	for i, role := range []string{"teacher", "teacher", "student", "student", "admin", "user", "superadmin", "teacher", "student"} {
		id := uint(i + 1)
		name := fmt.Sprint(id)
		create(&models.User{BaseModel: models.BaseModel{ID: id}, PublicID: name, Username: name, Role: role})
		users[id] = domainuser.User{ID: id, Role: role}
	}
	create(&models.Classroom{ControlPlaneModel: models.ControlPlaneModel{ID: 1}, PublicID: "one", TeacherID: 1, Name: "One"})
	create(&models.Classroom{ControlPlaneModel: models.ControlPlaneModel{ID: 2}, PublicID: "two", TeacherID: 2, Name: "Two"})
	create(&models.ClassroomStudent{StudentID: 3, ClassroomID: 1})
	create(&models.ClassroomStudent{StudentID: 4, ClassroomID: 2})
	create(&models.ClassroomStudent{StudentID: 9, ClassroomID: 1})
	now := time.Now().In(domain.ReportingZone)
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, domain.ReportingZone)
	create(&models.UsageVisit{EventID: uuid.NewString(), UserID: 3, ClassroomID: 1, Resource: "courseKnowledge", CreatedAt: today.Add(-time.Minute).UTC()})
	create(&models.UsageVisit{EventID: uuid.NewString(), UserID: 4, ClassroomID: 2, Resource: "python", CreatedAt: now.UTC()})
	create(&models.UsageVisit{EventID: uuid.NewString(), UserID: 6, Resource: "chat", CreatedAt: now.UTC()})
	create(&models.UsageVisit{EventID: uuid.NewString(), UserID: 3, ClassroomID: 1, Resource: "quiz", CreatedAt: today.AddDate(0, 0, -91).UTC()})
	create(&models.LearningAttempt{UserID: 3, AttemptID: uuid.NewString(), QuestionID: "q", CreatedAt: now})
	create(&models.LearningLessonAttempt{UserID: 4, AttemptID: uuid.NewString(), QuestionID: "q", Payload: "{}", CreatedAt: now.UTC()})
	create(&models.ClassroomHomework{PublicID: "h", ClassroomID: 1, TeacherID: 1, Title: "H", Questions: "[]", StartsAt: now.Add(-time.Hour), Deadline: now.Add(time.Hour)})
	create(&models.ClassroomHomeworkSubmission{HomeworkID: 1, StudentID: 3, Score: 80, Answers: "[]", Results: "[]", CreatedAt: now.UTC()})
	encode := func(value any) string {
		t.Helper()
		payload, err := json.Marshal(value)
		if err != nil {
			t.Fatal(err)
		}
		return string(payload)
	}
	lessons := learning.CourseCatalog().Lessons
	questions := []classroom.QuizQuestion{{ID: "first", LessonID: lessons[0].ID, Options: []string{"yes", "no"}, Answer: 0}, {ID: "second", LessonID: lessons[1].ID, Options: []string{"yes", "no"}, Answer: 0}}
	create(&models.ClassroomQuiz{PublicID: "q", ClassroomID: 1, TeacherID: 1, Title: "Q", Questions: encode(questions), Phase: "pre_class", Status: "open"})
	create(&models.ClassroomQuizSubmission{QuizID: 1, StudentID: 3, Answers: "[0,1]", CreatedAt: now.UTC()})
	create(&models.ClassroomQuiz{PublicID: "draft", ClassroomID: 1, TeacherID: 1, Title: "Draft", Questions: encode(questions), Phase: "pre_class", Status: "draft"})
	create(&models.LabAssessment{ID: "lab", ClassroomID: "one", CourseID: "L1", Version: "1", TeacherID: 1})
	state := lab.State{AssignmentID: "lab", UserID: 3, Tasks: map[string]*lab.TaskState{}}
	for _, id := range lab.TaskIDs("L1") {
		state.Tasks[id] = &lab.TaskState{TaskID: id, Attempts: []lab.Attempt{{SubmittedAt: &now, Result: &lab.Result{Score: 20, Independent: 15, Concepts: 5}}}, Checkpoints: map[string]lab.CheckpointResult{"O1": {Passed: true}, "O2": {Passed: true}}}
	}
	state.Tasks["L1-4"].Correction = &lab.Correction{Score: 10, TeacherID: 1, At: now}
	create(&models.LabAssessmentState{AssignmentID: "lab", UserID: 3, Payload: encode(state), UpdatedAt: now.UTC()})
	create(&models.LabAssessmentState{AssignmentID: "lab", UserID: 9, Payload: encode(lab.State{Tasks: map[string]*lab.TaskState{"L1-1": state.Tasks["L1-1"]}}), UpdatedAt: now.UTC()})
	gin.SetMode(gin.TestMode)
	router := gin.New()
	group := router.Group("/api/v1", func(c *gin.Context) {
		var actor uint
		_, _ = fmt.Sscan(c.GetHeader("X-User"), &actor)
		c.Set(middleware.ContextKeyUserID, actor)
	})
	NewModule(app.NewService(analyticsrepo.NewRepo(db), users)).RegisterRoutes(group)
	request := func(actor uint, method, path string, body any, status int) *httptest.ResponseRecorder {
		t.Helper()
		encoded, err := json.Marshal(body)
		if err != nil {
			t.Fatal(err)
		}
		req := httptest.NewRequest(method, "/api/v1"+path, bytes.NewReader(encoded))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("X-User", fmt.Sprint(actor))
		recorder := httptest.NewRecorder()
		router.ServeHTTP(recorder, req)
		if recorder.Code != status {
			t.Fatalf("%s %s actor %d: %d want %d: %s", method, path, actor, recorder.Code, status, recorder.Body.String())
		}
		return recorder
	}
	get := func(actor uint, query string) UsageReportResponse {
		t.Helper()
		recorder := request(actor, "GET", "/analytics/usage?days=7"+query, nil, 200)
		var result struct{ Data UsageReportResponse }
		if err := json.Unmarshal(recorder.Body.Bytes(), &result); err != nil {
			t.Fatal(err)
		}
		return result.Data
	}
	event := map[string]any{"eventId": uuid.NewString(), "path": "/learn/knowledge", "userId": 4, "classroomId": 2, "createdAt": today.AddDate(0, 0, -100)}
	request(3, "POST", "/analytics/visits", event, 200)
	request(3, "POST", "/analytics/visits", event, 200)
	request(3, "POST", "/analytics/visits", UsageVisitRequest{EventID: uuid.NewString(), Path: "/private?token=secret"}, 400)
	request(3, "POST", "/analytics/visits", UsageVisitRequest{EventID: "invalid", Path: "/chat"}, 400)
	for _, actor := range []uint{0, 3, 6} {
		request(actor, "GET", "/analytics/usage", nil, 403)
	}
	request(1, "GET", "/analytics/usage?classroomId=two", nil, 404)
	request(1, "GET", "/analytics/usage?days=365", nil, 400)
	request(1, "GET", "/analytics/usage?days=no", nil, 400)
	teacher := get(1, "")
	if teacher.Scope != "teacher" || teacher.Summary.Visits != 2 || teacher.Summary.Users != 2 || len(teacher.Resources) != 1 || len(teacher.Classrooms) != 1 {
		t.Fatalf("teacher scope: %+v", teacher)
	}
	if teacher.Summary.PracticeAnswers != 1 || teacher.Summary.HomeworkSubmissions != 1 || teacher.Summary.QuizSubmissions != 1 {
		t.Fatalf("activity counts: %+v", teacher.Summary)
	}
	if len(teacher.Daily) != 7 || teacher.Daily[5].Visits != 1 || teacher.Daily[6].Visits != 1 || teacher.FirstVisitAt == nil {
		t.Fatalf("Beijing days: %+v", teacher.Daily)
	}
	if teacher.Classrooms[0].Visits != 2 || teacher.Classrooms[0].Students != 2 {
		t.Fatalf("class breakdown: %+v", teacher.Classrooms)
	}
	if len(teacher.Homeworks) != 1 || teacher.Homeworks[0].Expected != 2 || teacher.Homeworks[0].Completed != 1 || teacher.Homeworks[0].ScoreSum != 80 || teacher.Homeworks[0].Distribution[3] != 1 {
		t.Fatalf("homework statistics: %+v", teacher.Homeworks)
	}
	if len(teacher.Labs) != 1 || teacher.Labs[0].Expected != 2 || teacher.Labs[0].Started != 2 || teacher.Labs[0].Completed != 1 || teacher.Labs[0].ScoreSum != 85 {
		t.Fatalf("lab statistics: %+v", teacher.Labs)
	}
	if len(teacher.Lessons) != 2 || teacher.Lessons[0].Expected != 2 || teacher.Lessons[0].Answered != 1 || teacher.Lessons[0].Correct != 1 || teacher.Lessons[1].Correct != 0 {
		t.Fatalf("lesson statistics: %+v", teacher.Lessons)
	}
	for _, actor := range []uint{5, 7} {
		all := get(actor, "")
		if all.Scope != "all" || all.Summary.Visits != 4 || all.Summary.PracticeAnswers != 2 || len(all.Classrooms) != 2 {
			t.Fatalf("admin scope: %+v", all)
		}
	}
	selected := get(5, "&classroomId=two")
	if selected.Summary.Visits != 1 || selected.Summary.HomeworkSubmissions != 0 || selected.Summary.PracticeAnswers != 1 {
		t.Fatalf("filtered scope: %+v", selected)
	}
	empty := get(8, "")
	if empty.Summary.Visits != 0 || empty.Summary.Users != 0 || len(empty.Classrooms) != 0 || len(empty.Daily) != 7 {
		t.Fatalf("empty scope: %+v", empty)
	}
	// Historical visits keep their original classroom when a student transfers.
	if err := db.Model(&models.ClassroomStudent{}).Where("student_id = ?", 3).Update("classroom_id", 2).Error; err != nil {
		t.Fatal(err)
	}
	if got := get(2, ""); got.Summary.Visits != 1 {
		t.Fatalf("transfer leaked earlier visits: %+v", got.Summary)
	}
	if got := get(1, ""); got.Homeworks[0].Expected != 1 || got.Homeworks[0].Completed != 0 || got.Labs[0].Started != 1 || got.Labs[0].Completed != 0 || got.Lessons[0].Answered != 0 {
		t.Fatalf("current roster results: %+v", got)
	}
	// A task closed before enrollment is excluded unless personal evidence exists.
	cutoff := now.Add(-2 * time.Hour)
	if err := db.Model(&models.ClassroomHomework{}).Where("public_id = ?", "h").Update("deadline", cutoff).Error; err != nil {
		t.Fatal(err)
	}
	if err := db.Model(&models.LabAssessment{}).Where("id = ?", "lab").Update("closed_at", cutoff).Error; err != nil {
		t.Fatal(err)
	}
	if got := get(1, ""); got.Homeworks[0].Expected != 0 || got.Labs[0].Expected != 1 {
		t.Fatalf("late enrollment: %+v %+v", got.Homeworks, got.Labs)
	}
	if err := db.Model(&models.ClassroomStudent{}).Where("student_id = ?", 3).Updates(map[string]any{"classroom_id": 1, "created_at": now}).Error; err != nil {
		t.Fatal(err)
	}
	if got := get(1, ""); got.Homeworks[0].Expected != 1 || got.Homeworks[0].Completed != 1 || got.Labs[0].Expected != 2 {
		t.Fatalf("returning student evidence: %+v %+v", got.Homeworks, got.Labs)
	}
}
