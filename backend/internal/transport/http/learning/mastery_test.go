package learning

import (
	"context"
	"encoding/json"
	"net/url"
	"path/filepath"
	"testing"
	"time"

	classapp "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/application/classroom"
	app "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/application/learning"
	classdomain "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/classroom"
	domain "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/learning"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/infra/persistence/models"
	classrepo "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/infra/persistence/postgres/classroom"
	labrepo "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/infra/persistence/postgres/learning"
	userrepo "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/infra/persistence/postgres/user"
	classhttp "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/transport/http/classroom"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/transport/http/learningview"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/transport/http/middleware"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func TestMasterySourcesAndClassroomIsolation(t *testing.T) {
	db, err := gorm.Open(sqlite.Open(filepath.Join(t.TempDir(), "mastery.db")), &gorm.Config{})
	if err != nil {
		t.Fatal(err)
	}
	sqlDB, _ := db.DB()
	t.Cleanup(func() { _ = sqlDB.Close() })
	if err := db.AutoMigrate(&models.User{}, &models.Classroom{}, &models.ClassroomStudent{}, &models.LearningAttempt{}, &models.LearningLessonAttempt{}, &models.ClassroomQuiz{}, &models.ClassroomQuizSubmission{}); err != nil {
		t.Fatal(err)
	}
	save := func(item any) {
		t.Helper()
		if err := db.Create(item).Error; err != nil {
			t.Fatal(err)
		}
	}
	for i, role := range []string{"teacher", "teacher", "student", "student", "admin"} {
		name := string(rune('a' + i))
		save(&models.User{BaseModel: models.BaseModel{ID: uint(i + 1)}, PublicID: name, Username: name, Role: role})
	}
	save(&models.Classroom{ControlPlaneModel: models.ControlPlaneModel{ID: 1}, PublicID: "one", TeacherID: 1, Name: "One"})
	save(&models.Classroom{ControlPlaneModel: models.ControlPlaneModel{ID: 2}, PublicID: "two", TeacherID: 2, Name: "Two"})
	save(&models.ClassroomStudent{StudentID: 3, ClassroomID: 1})
	save(&models.ClassroomStudent{StudentID: 4, ClassroomID: 2})
	// All sources must remain available beyond the former 90-day window.
	now := time.Now().UTC().AddDate(0, 0, -180).Truncate(time.Second)
	question := domain.Questions()[0]
	save(&models.LearningAttempt{UserID: 3, AttemptID: uuid.NewString(), QuestionID: question.ID, Correct: false, CreatedAt: now})
	save(&models.LearningAttempt{UserID: 3, AttemptID: uuid.NewString(), QuestionID: question.ID, VariantID: question.ID + "-v1", Mode: domain.AttemptModeReview, Correct: true, CreatedAt: now.Add(time.Minute)})
	lesson := domain.PracticeCourseLessons()[0]
	repo := labrepo.NewRepo(db)
	if _, err := repo.SaveLessonAttempt(context.Background(), domain.LessonAttempt{ID: uuid.NewString(), UserID: 3, Version: domain.CourseCatalog().Version, LessonID: lesson.ID, QuestionID: lesson.Questions[0].ID, Score: 1, Total: 1, CreatedAt: now}); err != nil {
		t.Fatal(err)
	}
	for i, state := range []string{"closed", "open", "closed"} {
		classID := uint(1)
		if i == 2 {
			classID = 2
		}
		questions, _ := json.Marshal([]classdomain.QuizQuestion{{ID: "snapshot-" + state + string(rune('a'+i)), LessonID: lesson.ID, Prompt: "snapshot prompt", Answer: 1}})
		save(&models.ClassroomQuiz{ControlPlaneModel: models.ControlPlaneModel{ID: uint(i + 1)}, PublicID: uuid.NewString(), ClassroomID: classID, TeacherID: classID, Title: "Quiz", Status: state, Questions: string(questions)})
		save(&models.ClassroomQuizSubmission{QuizID: uint(i + 1), StudentID: 3, Answers: "[0]", Score: 100, CreatedAt: now.Add(2 * time.Minute)})
	}
	learningService := app.NewService(repo)
	classroomService := classapp.NewService(classrepo.NewRepo(db), userrepo.NewRepo(db))
	classroomService.SetMasteryReader(learningService)
	router := gin.New()
	group := router.Group("/api/v1", middleware.AuthMiddleware("learning-test", nil))
	NewModule(learningService).RegisterRoutes(group)
	classhttp.NewModule(classhttp.NewHandler(classroomService)).RegisterRoutes(group)
	call := func(actor uint, path string, want int) []byte {
		t.Helper()
		r := request(t, router, actor, "GET", path, "")
		if r.Code != want {
			t.Fatalf("actor %d %s: %d %s", actor, path, r.Code, r.Body)
		}
		return r.Body.Bytes()
	}
	profile := func(actor uint, path string) learningview.LearningMasteryResponse {
		t.Helper()
		var env struct {
			Data learningview.LearningMasteryResponse
		}
		if err := json.Unmarshal(call(actor, path, 200), &env); err != nil {
			t.Fatal(err)
		}
		return env.Data
	}
	call(0, "/learning/mastery", 401)
	call(3, "/classrooms/one/mastery", 403)
	call(2, "/classrooms/one/mastery", 404)
	call(1, "/classrooms/one/students/d/mastery", 404)
	call(5, "/classrooms/one/mastery", 200)
	self := profile(3, "/learning/mastery?userId=4")
	other := profile(4, "/learning/mastery?userId=3")
	if self.Counts.Assessed != 2 || other.Counts.Assessed != 0 {
		t.Fatal("self isolation or evidence counts incorrect")
	}
	teacher := profile(1, "/classrooms/one/students/c/mastery")
	sources := map[string]int{}
	for _, c := range teacher.Concepts {
		for _, e := range c.Evidence {
			sources[e.Source]++
			if e.Source == "classroom" && e.Correct {
				t.Fatal("must grade snapshot answers, not trust total score")
			}
		}
	}
	if sources["practice"] != 1 || sources["review"] != 1 || sources["course"] != 1 || sources["classroom"] != 1 {
		t.Fatalf("sources or open/other-class isolation incorrect: %v", sources)
	}
	var report struct {
		Data classhttp.ClassroomMasteryResponse
	}
	if err := json.Unmarshal(call(1, "/classrooms/one/mastery", 200), &report); err != nil {
		t.Fatal(err)
	}
	if len(report.Data.Students) != 1 || report.Data.Students[0].ID != "c" {
		t.Fatal("roster scope")
	}
	for _, item := range report.Data.Concepts {
		if item.Concept.Questions != 0 || len(item.Concept.Evidence) != 0 || item.Concept.LastAt != nil {
			t.Fatal("class aggregate contains individual evidence")
		}
	}
	// The range includes the review at its start and excludes the quiz at its end.
	query := url.Values{"startAt": {now.Add(time.Minute).Format(time.RFC3339)}, "endAt": {now.Add(2 * time.Minute).Format(time.RFC3339)}}.Encode()
	for _, endpoint := range []struct {
		actor uint
		path  string
	}{{3, "/learning/mastery"}, {1, "/classrooms/one/students/c/mastery"}} {
		filtered := profile(endpoint.actor, endpoint.path+"?"+query)
		if filtered.Counts.Assessed != 1 || filtered.Counts.Developing != 1 {
			t.Fatalf("range should include only the review: %+v", filtered.Counts)
		}
		for _, c := range filtered.Concepts {
			for _, e := range c.Evidence {
				if e.Source != "review" {
					t.Fatalf("unexpected evidence in date range: %+v", e)
				}
			}
		}
	}
	if err := json.Unmarshal(call(1, "/classrooms/one/mastery?"+query, 200), &report); err != nil {
		t.Fatal(err)
	}
	if report.Data.Students[0].Counts.Assessed != 1 || report.Data.Students[0].Counts.Developing != 1 {
		t.Fatal("classroom report must use the same period as the student profile")
	}
	for _, path := range []string{"/learning/mastery", "/classrooms/one/mastery", "/classrooms/one/students/c/mastery"} {
		call(1, path+"?startAt=invalid", 400)
		call(1, path+"?startAt=2026-11-02T00:00:00Z&endAt=2026-11-01T00:00:00Z", 400)
	}
	if err := db.Where("student_id = ?", 3).Delete(&models.ClassroomStudent{}).Error; err != nil {
		t.Fatal(err)
	}
	call(1, "/classrooms/one/students/c/mastery", 404)
}
