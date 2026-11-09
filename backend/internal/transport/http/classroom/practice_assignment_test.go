package classroom

import (
	"encoding/json"
	"fmt"
	"net/http/httptest"
	"path/filepath"
	"strconv"
	"strings"
	"testing"
	"time"

	app "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/application/classroom"
	learningapp "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/application/learning"
	learning "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/learning"
	domainuser "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/user"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/infra/persistence/models"
	classrepo "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/infra/persistence/postgres/classroom"
	learningrepo "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/infra/persistence/postgres/learning"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/transport/http/middleware"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func TestAssignedPracticeHTTPWithDatabase(t *testing.T) {
	db, err := gorm.Open(sqlite.Open(filepath.Join(t.TempDir(), "practice.db")), &gorm.Config{})
	if err != nil {
		t.Fatal(err)
	}
	sqlDB, err := db.DB()
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = sqlDB.Close() })
	if err := db.AutoMigrate(&models.User{}, &models.Classroom{}, &models.ClassroomStudent{}, &models.ClassroomPracticeAssignment{}, &models.ClassroomPracticeSubmission{}, &models.LearningAttempt{}, &models.LearningLessonAttempt{}, &models.ClassroomQuiz{}, &models.ClassroomQuizSubmission{}, &models.ClassroomHomeworkSubmission{}); err != nil {
		t.Fatal(err)
	}
	users := []models.User{
		{PublicID: "teacher", Username: "teacher", Role: "teacher"},
		{PublicID: "outsider", Username: "outsider", Role: "teacher"},
		{PublicID: "student", Username: "student", Role: "student"},
		{PublicID: "not-selected", Username: "not-selected", Role: "student"},
		{PublicID: "other-class", Username: "other-class", Role: "student"},
	}
	if err := db.Create(&users).Error; err != nil {
		t.Fatal(err)
	}
	if err := db.Create(&[]models.Classroom{{PublicID: "class", TeacherID: 1, Name: "Test"}, {PublicID: "other", TeacherID: 2, Name: "Other"}}).Error; err != nil {
		t.Fatal(err)
	}
	if err := db.Create(&[]models.ClassroomStudent{{ClassroomID: 1, StudentID: 3}, {ClassroomID: 1, StudentID: 4}, {ClassroomID: 2, StudentID: 5}}).Error; err != nil {
		t.Fatal(err)
	}
	reader := handlerTestUsers{}
	for _, user := range users {
		reader[user.ID] = domainuser.User{ID: user.ID, PublicID: user.PublicID, Username: user.Username, Role: user.Role}
	}
	learn := learningapp.NewService(learningrepo.NewRepo(db))
	service := app.NewService(classrepo.NewRepo(db), reader)
	service.SetMasteryReader(learn)
	gin.SetMode(gin.TestMode)
	router := gin.New()
	group := router.Group("/api/v1", func(c *gin.Context) {
		var id uint
		_, _ = fmt.Sscan(c.GetHeader("X-Test-User-ID"), &id)
		c.Set(middleware.ContextKeyUserID, id)
		c.Next()
	})
	NewModule(NewHandler(service)).RegisterRoutes(group)
	request := func(actor uint, method, path string, body any, status int) *httptest.ResponseRecorder {
		t.Helper()
		data, err := json.Marshal(body)
		if err != nil {
			t.Fatal(err)
		}
		r := performClassroomRequest(router, method, "/api/v1"+path, string(data), actor)
		if r.Code != status {
			t.Fatalf("%s %s: %d want %d: %s", method, path, r.Code, status, r.Body.String())
		}
		return r
	}
	const conceptID = "lesson:ss-2-8"
	bank := learning.FindPracticeBank(conceptID, "zh-CN")
	if bank == nil || len(bank.Questions) < 3 {
		t.Fatal("test needs a practice bank with three questions")
	}
	questions := bank.Questions[:3]
	answers := map[string]map[string]string{}
	ids := []string{}
	hasNumeric := false
	for _, q := range questions {
		ids = append(ids, q.ID)
		value := map[string]string{}
		if len(q.Options) > 0 {
			value["choice"] = strconv.Itoa(q.Answer)
		}
		for _, f := range q.Fields {
			value[f.ID] = strconv.FormatFloat(f.Expected, 'f', -1, 64)
			hasNumeric = true
		}
		answers[q.ID] = value
	}
	if !hasNumeric {
		t.Fatal("test must cover numeric grading")
	}
	// Seed prior wrong evidence, so publication captures a meaningful baseline.
	first := questions[0]
	wrong := map[string]string{}
	if len(first.Options) > 0 {
		wrong["choice"] = strconv.Itoa((first.Answer + 1) % len(first.Options))
	}
	for _, f := range first.Fields {
		wrong[f.ID] = strconv.FormatFloat(f.Expected+1, 'f', -1, 64)
	}
	if _, err := learn.SubmitPractice(t.Context(), 3, uuid.NewString(), conceptID, first.ID, "zh-CN", wrong); err != nil {
		t.Fatal(err)
	}
	request(3, "GET", "/classrooms/class/practice-candidates?conceptId="+conceptID, nil, 403)
	request(2, "GET", "/classrooms/class/practice-candidates?conceptId="+conceptID, nil, 404)
	request(1, "GET", "/classrooms/class/practice-candidates?conceptId="+conceptID, nil, 200)
	publish := PracticePublishRequest{ConceptID: conceptID, Title: "Targeted practice", Locale: "zh-CN", QuestionIDs: ids, StudentIDs: []string{"student"}, Deadline: time.Now().Add(time.Hour)}
	request(2, "POST", "/classrooms/class/practice-assignments", publish, 404)
	request(3, "POST", "/classrooms/class/practice-assignments", publish, 403)
	invalid := publish
	invalid.StudentIDs = []string{"other-class"}
	request(1, "POST", "/classrooms/class/practice-assignments", invalid, 400)
	invalid = publish
	invalid.QuestionIDs = []string{ids[0], ids[0], ids[1]}
	request(1, "POST", "/classrooms/class/practice-assignments", invalid, 400)
	var created struct{ Data PracticeAssignmentResponse }
	if err := json.Unmarshal(request(1, "POST", "/classrooms/class/practice-assignments", publish, 200).Body.Bytes(), &created); err != nil {
		t.Fatal(err)
	}
	if len(created.Data.Students) != 1 || created.Data.Students[0].BaselineStatus != "weak" {
		t.Fatalf("baseline: %+v", created.Data.Students)
	}
	id := created.Data.ID
	list := request(3, "GET", "/student/practice-assignments", nil, 200)
	var student struct{ Data PracticeAssignmentsResponse }
	if err := json.Unmarshal(list.Body.Bytes(), &student); err != nil {
		t.Fatal(err)
	}
	if len(student.Data.Items) != 1 || len(student.Data.Items[0].Students) != 0 || student.Data.Items[0].Submission != nil {
		t.Fatal("student payload has other recipients or results")
	}
	for _, secret := range []string{`"expected"`, `"answer"`, `"explanation"`, `"baselineStatus"`} {
		if strings.Contains(list.Body.String(), secret) {
			t.Fatalf("student payload leaked %s", secret)
		}
	}
	for _, actor := range []uint{4, 5} {
		var hidden struct{ Data PracticeAssignmentsResponse }
		if err := json.Unmarshal(request(actor, "GET", "/student/practice-assignments", nil, 200).Body.Bytes(), &hidden); err != nil {
			t.Fatal(err)
		}
		if len(hidden.Data.Items) != 0 {
			t.Fatal("unassigned student received task")
		}
		request(actor, "POST", "/practice-assignments/"+id+"/submissions", AssignedPracticeSubmitRequest{Answers: answers}, 404)
	}
	request(2, "GET", "/classrooms/class/practice-assignments", nil, 404)
	request(3, "GET", "/classrooms/class/practice-assignments", nil, 403)
	submit := AssignedPracticeSubmitRequest{Answers: answers}
	var result struct {
		Data AssignedPracticeSubmissionResponse
	}
	if err := json.Unmarshal(request(3, "POST", "/practice-assignments/"+id+"/submissions", submit, 200).Body.Bytes(), &result); err != nil {
		t.Fatal(err)
	}
	if result.Data.Correct != 3 || len(result.Data.Results) != 3 || result.Data.SubmittedAt.IsZero() {
		t.Fatalf("bad grade: %+v", result.Data)
	}
	for _, item := range result.Data.Results {
		if len(item.Expected) == 0 || item.Explanation == "" {
			t.Fatal("submission feedback missing")
		}
	}
	// Retry after the deadline returns the same save, without duplicate evidence.
	if err := db.Model(&models.ClassroomPracticeAssignment{}).Where("public_id = ?", id).Update("deadline", time.Now().Add(-time.Second)).Error; err != nil {
		t.Fatal(err)
	}
	var retried struct {
		Data AssignedPracticeSubmissionResponse
	}
	if err := json.Unmarshal(request(3, "POST", "/practice-assignments/"+id+"/submissions", submit, 200).Body.Bytes(), &retried); err != nil {
		t.Fatal(err)
	}
	if !retried.Data.SubmittedAt.Equal(result.Data.SubmittedAt) {
		t.Fatal("retry created another submission")
	}
	answers[first.ID] = wrong
	request(3, "POST", "/practice-assignments/"+id+"/submissions", submit, 409)
	var evidenceCount, formalCount int64
	if err := db.Model(&models.LearningLessonAttempt{}).Where("user_id = ?", 3).Count(&evidenceCount).Error; err != nil {
		t.Fatal(err)
	}
	if evidenceCount != 4 {
		t.Fatalf("evidence count %d, want one baseline plus three answers", evidenceCount)
	}
	for _, model := range []any{&models.ClassroomQuizSubmission{}, &models.ClassroomHomeworkSubmission{}} {
		if err := db.Model(model).Count(&formalCount).Error; err != nil {
			t.Fatal(err)
		}
		if formalCount != 0 {
			t.Fatal("practice changed formal grades")
		}
	}
	profile, err := learn.Mastery(t.Context(), 3, learning.MasteryPeriod{})
	if err != nil {
		t.Fatal(err)
	}
	found := false
	for _, concept := range profile.Concepts {
		if concept.ID == conceptID {
			found = concept.Questions == 3 && concept.Correct == 3 && concept.Status == "secure"
		}
	}
	if !found {
		t.Fatal("practice did not update actual mastery evidence")
	}
	var report struct{ Data PracticeAssignmentsResponse }
	if err := json.Unmarshal(request(1, "GET", "/classrooms/class/practice-assignments", nil, 200).Body.Bytes(), &report); err != nil {
		t.Fatal(err)
	}
	if report.Data.Items[0].Students[0].BaselineStatus != "weak" || report.Data.Items[0].Students[0].Submission.Correct != 3 {
		t.Fatal("report lost baseline or submission")
	}
	// A new, unfinished task rejects late submissions and removed roster members.
	publish.StudentIDs = []string{"not-selected"}
	if err := json.Unmarshal(request(1, "POST", "/classrooms/class/practice-assignments", publish, 200).Body.Bytes(), &created); err != nil {
		t.Fatal(err)
	}
	if err := db.Model(&models.ClassroomPracticeAssignment{}).Where("public_id = ?", created.Data.ID).Update("deadline", time.Now().Add(-time.Second)).Error; err != nil {
		t.Fatal(err)
	}
	request(4, "POST", "/practice-assignments/"+created.Data.ID+"/submissions", submit, 409)
	if err := db.Model(&models.ClassroomStudent{}).Where("student_id = ?", 3).Update("classroom_id", 2).Error; err != nil {
		t.Fatal(err)
	}
	request(3, "POST", "/practice-assignments/"+id+"/submissions", submit, 404)
}
