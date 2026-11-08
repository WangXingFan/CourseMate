package classroom

import (
	"encoding/json"
	"fmt"
	"net/http/httptest"
	"path/filepath"
	"testing"
	"time"

	app "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/application/classroom"
	domain "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/classroom"
	domainuser "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/user"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/infra/persistence/models"
	classrepo "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/infra/persistence/postgres/classroom"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/transport/http/middleware"
	"github.com/gin-gonic/gin"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

type homeworkRequest func(uint, string, string, any, int) *httptest.ResponseRecorder

func homeworkHTTPFixture(t *testing.T) (*gorm.DB, homeworkRequest) {
	t.Helper()
	db, err := gorm.Open(sqlite.Open(filepath.Join(t.TempDir(), "homework.db")), &gorm.Config{})
	if err != nil {
		t.Fatal(err)
	}
	sqlDB, err := db.DB()
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = sqlDB.Close() })
	if err := db.AutoMigrate(&models.User{}, &models.Classroom{}, &models.ClassroomStudent{}, &models.ClassroomHomework{}, &models.ClassroomHomeworkSubmission{}); err != nil {
		t.Fatal(err)
	}
	users := []models.User{{PublicID: "teacher", Username: "teacher", Role: "teacher"}, {PublicID: "outsider", Username: "outsider", Role: "teacher"}, {PublicID: "otherstudent", Username: "otherstudent", Role: "student"}, {PublicID: "student", Username: "student", Role: "student"}}
	if err := db.Create(&users).Error; err != nil {
		t.Fatal(err)
	}
	if err := db.Create(&models.Classroom{PublicID: "class", TeacherID: 1, Name: "Test"}).Error; err != nil {
		t.Fatal(err)
	}
	if err := db.Create(&models.ClassroomStudent{ClassroomID: 1, StudentID: 4}).Error; err != nil {
		t.Fatal(err)
	}
	if err := db.Create(&models.Classroom{PublicID: "otherclass", TeacherID: 2, Name: "Other"}).Error; err != nil {
		t.Fatal(err)
	}
	if err := db.Create(&models.ClassroomStudent{ClassroomID: 2, StudentID: 3}).Error; err != nil {
		t.Fatal(err)
	}
	reader := handlerTestUsers{}
	for _, user := range users {
		reader[user.ID] = domainuser.User{ID: user.ID, PublicID: user.PublicID, Username: user.Username, Role: user.Role}
	}
	gin.SetMode(gin.TestMode)
	router := gin.New()
	group := router.Group("/api/v1", func(c *gin.Context) {
		var id uint
		_, _ = fmt.Sscan(c.GetHeader("X-Test-User-ID"), &id)
		c.Set(middleware.ContextKeyUserID, id)
		c.Next()
	})
	NewModule(NewHandler(app.NewService(classrepo.NewRepo(db), reader))).RegisterRoutes(group)
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
	return db, request
}

func TestHomeworkHTTPWithDatabase(t *testing.T) {
	db, request := homeworkHTTPFixture(t)
	request(4, "GET", "/classrooms/class/homework-bank", nil, 403)
	request(2, "GET", "/classrooms/class/homework-bank", nil, 404)
	request(1, "GET", "/classrooms/class/homework-bank", nil, 200)
	now := time.Now().UTC()
	request(1, "POST", "/classrooms/class/homeworks", HomeworkPublishRequest{BankID: "homework-1", StartsAt: now, Deadline: now.Add(-time.Hour)}, 400)
	for _, paper := range domain.HomeworkBank() {
		start, end := now.Add(-time.Minute), now.Add(time.Hour)
		if paper.ID == "homework-1" {
			start, end = now.Add(time.Hour), now.Add(2*time.Hour)
		}
		r := request(1, "POST", "/classrooms/class/homeworks", HomeworkPublishRequest{BankID: paper.ID, StartsAt: start, Deadline: end}, 200)
		var payload struct {
			Data HomeworkResponse `json:"data"`
		}
		if err := json.Unmarshal(r.Body.Bytes(), &payload); err != nil {
			t.Fatal(err)
		}
		id := payload.Data.ID
		answers := make([][]string, len(paper.Questions))
		for i, q := range paper.Questions {
			for _, aliases := range q.Accepted {
				answers[i] = append(answers[i], aliases[0])
			}
		}
		if paper.ID == "homework-1" {
			request(4, "POST", "/homeworks/"+id+"/submissions", HomeworkSubmitRequest{Answers: answers}, 409)
			list := request(4, "GET", "/student/homeworks", nil, 200)
			var data struct {
				Data StudentHomeworksResponse `json:"data"`
			}
			if err := json.Unmarshal(list.Body.Bytes(), &data); err != nil {
				t.Fatal(err)
			}
			if len(data.Data.Items[0].Questions) != 0 {
				t.Fatal("scheduled questions leaked")
			}
			if err := db.Model(&models.ClassroomHomework{}).Where("public_id = ?", id).Update("starts_at", now.Add(-time.Minute)).Error; err != nil {
				t.Fatal(err)
			}
		}
		request(3, "POST", "/homeworks/"+id+"/submissions", HomeworkSubmitRequest{Answers: answers}, 404)
		request(2, "GET", "/homeworks/"+id+"/report", nil, 404)
		request(4, "GET", "/homeworks/"+id+"/report", nil, 403)
		request(4, "POST", "/homeworks/"+id+"/submissions", HomeworkSubmitRequest{Answers: answers[:1]}, 400)
		sub := request(4, "POST", "/homeworks/"+id+"/submissions", HomeworkSubmitRequest{Answers: answers}, 200)
		var result struct {
			Data HomeworkSubmissionResponse `json:"data"`
		}
		if err := json.Unmarshal(sub.Body.Bytes(), &result); err != nil {
			t.Fatal(err)
		}
		if result.Data.Score != 100 || len(result.Data.Results) != 10 {
			t.Fatalf("bad grade: %+v", result.Data)
		}
		request(4, "POST", "/homeworks/"+id+"/submissions", HomeworkSubmitRequest{Answers: answers}, 409)
		report := request(1, "GET", "/homeworks/"+id+"/report", nil, 200)
		var saved struct {
			Data HomeworkReportResponse `json:"data"`
		}
		if err := json.Unmarshal(report.Body.Bytes(), &saved); err != nil {
			t.Fatal(err)
		}
		if len(saved.Data.Submissions) != 1 || saved.Data.Submissions[0].Score != 100 {
			t.Fatal("grade not persisted")
		}
		if err := db.Model(&models.ClassroomHomework{}).Where("public_id = ?", id).Update("deadline", now.Add(-time.Second)).Error; err != nil {
			t.Fatal(err)
		}
		request(4, "POST", "/homeworks/"+id+"/submissions", HomeworkSubmitRequest{Answers: answers}, 409)
	}
	list := request(4, "GET", "/student/homeworks", nil, 200)
	var data struct {
		Data StudentHomeworksResponse `json:"data"`
	}
	if err := json.Unmarshal(list.Body.Bytes(), &data); err != nil {
		t.Fatal(err)
	}
	if len(data.Data.Items) != 4 {
		t.Fatal("missing homework")
	}
	for _, item := range data.Data.Items {
		if item.Submission == nil || item.Submission.Score != 100 {
			t.Fatal("missing persisted score")
		}
		for _, q := range item.Questions {
			if len(q.Accepted) > 0 {
				t.Fatal("answer keys leaked")
			}
		}
	}
}
