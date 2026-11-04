package learning

import (
	"encoding/json"
	"net/http"
	"path/filepath"
	"testing"

	classapp "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/application/classroom"
	app "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/application/learning"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/infra/persistence/models"
	classrepo "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/infra/persistence/postgres/classroom"
	labrepo "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/infra/persistence/postgres/learning"
	userrepo "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/infra/persistence/postgres/user"
	classhttp "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/transport/http/classroom"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/transport/http/middleware"
	"github.com/gin-gonic/gin"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func TestExperimentSwitchesEnforceClassroomOwnershipAndCourseAccess(t *testing.T) {
	dbPath := filepath.Join(t.TempDir(), "access.db")
	db, err := gorm.Open(sqlite.Open(dbPath), &gorm.Config{})
	if err != nil {
		t.Fatal(err)
	}
	if err := db.AutoMigrate(&models.User{}, &models.Classroom{}, &models.ClassroomStudent{}, &models.LearningVirtualLab{}); err != nil {
		t.Fatal(err)
	}
	for i, role := range []string{"teacher", "teacher", "student", "student", "student", "admin"} {
		id := uint(i + 1)
		name := string(rune('a' + i))
		if err := db.Create(&models.User{BaseModel: models.BaseModel{ID: id}, PublicID: name, Username: name, Role: role}).Error; err != nil {
			t.Fatal(err)
		}
	}
	for _, classroom := range []models.Classroom{
		{ControlPlaneModel: models.ControlPlaneModel{ID: 1}, PublicID: "class-one", TeacherID: 1, Name: "One"},
		{ControlPlaneModel: models.ControlPlaneModel{ID: 2}, PublicID: "class-two", TeacherID: 2, Name: "Two"},
	} {
		if err := db.Create(&classroom).Error; err != nil {
			t.Fatal(err)
		}
	}
	for _, member := range []models.ClassroomStudent{{StudentID: 3, ClassroomID: 1}, {StudentID: 4, ClassroomID: 2}} {
		if err := db.Create(&member).Error; err != nil {
			t.Fatal(err)
		}
	}
	router := gin.New()
	group := router.Group("/api/v1", middleware.AuthMiddleware("learning-test", nil))
	NewModule(app.NewService(labrepo.NewRepo(db))).RegisterRoutes(group)
	classhttp.NewModule(classhttp.NewHandler(classapp.NewService(classrepo.NewRepo(db), userrepo.NewRepo(db)))).RegisterRoutes(group)
	call := func(actor uint, method, path, body string, want int) []byte {
		t.Helper()
		r := request(t, router, actor, method, path, body)
		if r.Code != want {
			t.Fatalf("%s %s actor %d: %d %s", method, path, actor, r.Code, r.Body)
		}
		return r.Body.Bytes()
	}
	access := func(actor uint) map[string]bool {
		t.Helper()
		var env struct {
			Data LearningVirtualLabAccessResponse
		}
		if err := json.Unmarshal(call(actor, "GET", "/learning/virtual-lab/access", "", 200), &env); err != nil {
			t.Fatal(err)
		}
		return env.Data.Courses
	}
	setPath := "/classrooms/class-one/experiments/L1"
	for _, student := range []uint{3, 4, 5} {
		if access(student)["L1"] {
			t.Fatal("default must be closed")
		}
	}
	call(0, "PUT", setPath, `{"open":true}`, 401)
	call(3, "PUT", setPath, `{"open":true}`, 403)
	call(2, "PUT", setPath, `{"open":true}`, 404)
	call(1, "PUT", setPath, `{}`, 400)
	call(1, "PUT", "/classrooms/class-one/experiments/L9", `{"open":true}`, 400)
	document := labDocument(t, "")
	call(3, "PUT", "/learning/virtual-lab", labBody(document, 0), 403)
	call(1, "PUT", setPath, `{"open":true}`, 200)
	if !access(3)["L1"] || access(3)["L2"] || access(4)["L1"] || access(5)["L1"] {
		t.Fatal("class/course access leaked")
	}
	for _, staff := range []uint{1, 6} {
		if !access(staff)["L3"] {
			t.Fatal("staff preview denied")
		}
	}
	var raw map[string]any
	if err := json.Unmarshal([]byte(document), &raw); err != nil {
		t.Fatal(err)
	}
	tasks := raw["tasks"].(map[string]any)
	tasks["L1-1"].(map[string]any)["prediction"] = "first experiment"
	encoded, _ := json.Marshal(raw)
	call(3, "PUT", "/learning/virtual-lab", labBody(string(encoded), 0), 200)
	// A forged whole-document save must not alter a closed experiment.
	tasks["L2-1"].(map[string]any)["prediction"] = "forged second experiment"
	encoded, _ = json.Marshal(raw)
	call(3, "PUT", "/learning/virtual-lab", labBody(string(encoded), 1), 403)
	call(1, "PUT", "/classrooms/class-one/experiments/L2", `{"open":true}`, 200)
	call(3, "PUT", "/learning/virtual-lab", labBody(string(encoded), 1), 200)
	call(1, "PUT", setPath, `{"open":false}`, 200)
	tasks["L1-1"].(map[string]any)["analysis"] = "after closure"
	encoded, _ = json.Marshal(raw)
	call(3, "PUT", "/learning/virtual-lab", labBody(string(encoded), 2), 403)
	tasks["L1-1"].(map[string]any)["analysis"] = ""
	tasks["L2-1"].(map[string]any)["analysis"] = "second remains open"
	encoded, _ = json.Marshal(raw)
	call(3, "PUT", "/learning/virtual-lab", labBody(string(encoded), 2), 200)
	call(1, "PUT", "/classrooms/class-one/experiments/L2", `{"open":false}`, 200)
	call(3, "PUT", "/learning/virtual-lab", labBody(string(encoded), 3), 403)
	call(3, "GET", "/learning/virtual-lab", "", http.StatusOK)
	sqlDB, _ := db.DB()
	if err := sqlDB.Close(); err != nil {
		t.Fatal(err)
	}
	reopened, err := gorm.Open(sqlite.Open(dbPath), &gorm.Config{})
	if err != nil {
		t.Fatal(err)
	}
	defer func() { conn, _ := reopened.DB(); _ = conn.Close() }()
	var persisted models.Classroom
	if err := reopened.First(&persisted, 1).Error; err != nil {
		t.Fatal(err)
	}
	if persisted.Lab1Open || persisted.Lab2Open || persisted.Lab3Open {
		t.Fatal("closure did not persist")
	}
}
