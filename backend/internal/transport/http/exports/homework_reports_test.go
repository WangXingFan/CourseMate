package exports

import (
	"archive/zip"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"testing"
	"time"

	app "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/application/exports"
	domain "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/classroom"
	user "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/user"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/infra/persistence/models"
	classrepo "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/infra/persistence/postgres/classroom"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/transport/http/middleware"
	"github.com/gin-gonic/gin"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func TestHomeworkReportExportSelectionAndAccess(t *testing.T) {
	db, err := gorm.Open(sqlite.Open(filepath.Join(t.TempDir(), "homework.db")), &gorm.Config{})
	if err != nil {
		t.Fatal(err)
	}
	connection, err := db.DB()
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = connection.Close() })
	if err := db.AutoMigrate(&models.User{}, &models.Classroom{}, &models.ClassroomStudent{}, &models.ClassroomHomework{}, &models.ClassroomHomeworkSubmission{}); err != nil {
		t.Fatal(err)
	}
	create := func(value any) {
		t.Helper()
		if err := db.Create(value).Error; err != nil {
			t.Fatal(err)
		}
	}
	now := time.Now().UTC()
	users := gradeUsers{}
	for i, role := range []string{user.RoleTeacher, user.RoleTeacher, user.RoleStudent, user.RoleStudent, user.RoleStudent} {
		id := uint(i + 1)
		create(&models.User{BaseModel: models.BaseModel{ID: id}, PublicID: fmt.Sprint(id), Username: fmt.Sprintf("00%d", id), DisplayName: "同名学生", Role: role})
		users[id] = user.User{ID: id, Role: role, Status: user.StatusActive}
	}
	create(&models.Classroom{ControlPlaneModel: models.ControlPlaneModel{ID: 1}, PublicID: "one", TeacherID: 1, Name: "信号班"})
	create(&models.Classroom{ControlPlaneModel: models.ControlPlaneModel{ID: 2}, PublicID: "two", TeacherID: 1, Name: "另一班"})
	for _, id := range []uint{3, 4} {
		create(&models.ClassroomStudent{ClassroomID: 1, StudentID: id, CreatedAt: now.Add(-time.Hour)})
	}
	repo := classrepo.NewRepo(db)
	for i, id := range []string{"first", "second", "scheduled", "withdrawn", "foreign"} {
		classID, start := uint(1), now.Add(-time.Hour)
		if id == "foreign" {
			classID = 2
		}
		if id == "scheduled" {
			start = now.Add(time.Hour)
		}
		item, err := repo.CreateHomework(context.Background(), domain.Homework{PublicID: id, ClassroomID: classID, TeacherID: 1, BankID: "homework-1", Title: "作业一", Questions: []domain.HomeworkQuestion{{ID: fmt.Sprint(i), Prompt: id, Kind: "single", Points: 100, Options: []string{"甲", "乙"}, Accepted: [][]string{{"0"}}}}, StartsAt: start, Deadline: now.Add(2 * time.Hour)})
		if err != nil {
			t.Fatal(err)
		}
		if id == "withdrawn" {
			if err := db.Model(&models.ClassroomHomework{}).Where("id = ?", item.ID).Update("withdrawn", true).Error; err != nil {
				t.Fatal(err)
			}
		}
		if id == "first" || id == "second" {
			create(&models.ClassroomHomeworkSubmission{HomeworkID: item.ID, StudentID: 3, Score: 100, Answers: `[["0"]]`, Results: `[{"QuestionID":"0","Score":100,"Total":100,"Correct":[true]}]`})
		}
		if id == "second" {
			create(&models.ClassroomHomeworkSubmission{HomeworkID: item.ID, StudentID: 5, Score: 0, Answers: `[["1"]]`, Results: `[]`})
		}
	}
	gin.SetMode(gin.TestMode)
	router := gin.New()
	group := router.Group("/api/v1", func(c *gin.Context) {
		var actor uint
		_, _ = fmt.Sscan(c.GetHeader("X-User"), &actor)
		c.Set(middleware.ContextKeyUserID, actor)
	})
	NewModule(app.NewService(repo, nil, nil, nil, users)).RegisterRoutes(group)
	for _, tc := range []struct {
		actor  uint
		id     string
		status int
	}{{1, "first", 200}, {1, "second", 200}, {1, "", 400}, {1, "missing", 404}, {1, "foreign", 404}, {1, "scheduled", 400}, {1, "withdrawn", 400}, {2, "first", 404}, {3, "first", 403}} {
		body, _ := json.Marshal(ClassroomExportRequest{Kind: "homework_reports", HomeworkID: tc.id, FilenameTemplate: "../{姓名}_{作业}"})
		req := httptest.NewRequest("POST", "/api/v1/classrooms/one/exports", bytes.NewReader(body))
		req.Header.Set("X-User", fmt.Sprint(tc.actor))
		req.Header.Set("Content-Type", "application/json")
		response := httptest.NewRecorder()
		router.ServeHTTP(response, req)
		if response.Code != tc.status {
			t.Fatalf("actor %d homework %s: %d expected %d", tc.actor, tc.id, response.Code, tc.status)
		}
		if tc.status != 200 {
			continue
		}
		if response.Header().Get("Content-Type") != "application/zip" || response.Header().Get("Cache-Control") != "no-store" {
			t.Fatal("missing ZIP content type or private cache policy")
		}
		z, err := zip.NewReader(bytes.NewReader(response.Body.Bytes()), int64(response.Body.Len()))
		if err != nil {
			t.Fatal(err)
		}
		expected := 2
		if tc.id == "second" {
			expected = 3 // The former student's paper belongs only to this publication.
		}
		if len(z.File) != expected {
			t.Fatalf("homework %s: %d PDFs, expected %d", tc.id, len(z.File), expected)
		}
		names := map[string]bool{}
		for _, file := range z.File {
			if strings.ContainsAny(file.Name, `/\`) || names[file.Name] {
				t.Fatalf("unsafe or duplicated filename %s", file.Name)
			}
			names[file.Name] = true
			r, err := file.Open()
			if err != nil {
				t.Fatal(err)
			}
			data, err := io.ReadAll(r)
			r.Close()
			if err != nil || !bytes.HasPrefix(data, []byte("%PDF-")) {
				t.Fatalf("invalid PDF %s: %v", file.Name, err)
			}
		}
	}
}
