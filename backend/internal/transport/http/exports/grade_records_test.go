package exports

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http/httptest"
	"path/filepath"
	"slices"
	"testing"
	"time"

	app "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/application/exports"
	domain "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/classroom"
	user "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/user"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/infra/persistence/models"
	classrepo "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/infra/persistence/postgres/classroom"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/transport/http/middleware"
	"github.com/gin-gonic/gin"
	"github.com/xuri/excelize/v2"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

type gradeUsers map[uint]user.User

func (users gradeUsers) GetByID(_ context.Context, id uint) (*user.User, error) {
	u := users[id]
	return &u, nil
}

func TestGradeSnapshotHTTPStalenessEligibilityAndImmutability(t *testing.T) {
	db, err := gorm.Open(sqlite.Open(filepath.Join(t.TempDir(), "grades.db")), &gorm.Config{})
	if err != nil {
		t.Fatal(err)
	}
	connection, err := db.DB()
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = connection.Close() })
	if err := db.AutoMigrate(&models.User{}, &models.Classroom{}, &models.ClassroomStudent{}, &models.ClassroomHomework{}, &models.ClassroomHomeworkSubmission{}, &models.ClassroomGradeRecord{}); err != nil {
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
		create(&models.User{BaseModel: models.BaseModel{ID: id}, PublicID: fmt.Sprint(id), Username: fmt.Sprintf("00%d", id), DisplayName: fmt.Sprint(id), Role: role})
		users[id] = user.User{ID: id, Role: role, Status: user.StatusActive}
	}
	create(&models.Classroom{ControlPlaneModel: models.ControlPlaneModel{ID: 1}, PublicID: "one", TeacherID: 1, Name: "信号班"})
	create(&models.Classroom{ControlPlaneModel: models.ControlPlaneModel{ID: 2}, PublicID: "two", TeacherID: 1, Name: "另一班"})
	for _, id := range []uint{3, 4, 5} {
		joined := now.Add(-time.Hour)
		if id == 3 {
			joined = now.Add(-8 * time.Hour)
		}
		create(&models.ClassroomStudent{ClassroomID: 1, StudentID: id, CreatedAt: joined})
	}
	questions, err := json.Marshal([]domain.HomeworkQuestion{{ID: "q", Points: 100}})
	if err != nil {
		t.Fatal(err)
	}
	create(&models.ClassroomHomework{ControlPlaneModel: models.ControlPlaneModel{ID: 1}, PublicID: "ended", ClassroomID: 1, TeacherID: 1, Title: "已结束作业", Questions: string(questions), StartsAt: now.Add(-10 * time.Hour), Deadline: now.Add(-2 * time.Hour)})
	create(&models.ClassroomHomework{PublicID: "ongoing", ClassroomID: 1, TeacherID: 1, Title: "进行中", Questions: string(questions), StartsAt: now.Add(-time.Hour), Deadline: now.Add(time.Hour)})
	create(&models.ClassroomHomeworkSubmission{HomeworkID: 1, StudentID: 3, Score: 80, Answers: "[]", Results: "[]"})
	create(&models.ClassroomHomeworkSubmission{HomeworkID: 1, StudentID: 5, Score: 60, Answers: "[]", Results: "[]"})
	repo := classrepo.NewRepo(db)
	gin.SetMode(gin.TestMode)
	router := gin.New()
	group := router.Group("/api/v1", func(c *gin.Context) {
		var actor uint
		_, _ = fmt.Sscan(c.GetHeader("X-User"), &actor)
		c.Set(middleware.ContextKeyUserID, actor)
	})
	NewModule(app.NewService(repo, nil, nil, nil, users)).RegisterRoutes(group)
	request := func(actor uint, method, path string, body any, status int) *httptest.ResponseRecorder {
		t.Helper()
		payload, err := json.Marshal(body)
		if err != nil {
			t.Fatal(err)
		}
		req := httptest.NewRequest(method, "/api/v1/classrooms/"+path, bytes.NewReader(payload))
		req.Header.Set("X-User", fmt.Sprint(actor))
		req.Header.Set("Content-Type", "application/json")
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)
		if rec.Code != status {
			t.Fatalf("%s %s: %d %s", method, path, rec.Code, rec.Body.String())
		}
		return rec
	}
	options := ClassroomExportRequest{Kind: "summary", Weights: map[string]float64{"homeworks": 100}}
	preview := func() GradePreviewResponse {
		t.Helper()
		var body struct {
			Data GradePreviewResponse `json:"data"`
		}
		if err := json.Unmarshal(request(1, "POST", "one/grade-preview", options, 200).Body.Bytes(), &body); err != nil {
			t.Fatal(err)
		}
		return body.Data
	}
	first := preview()
	if len(first.Students) != 3 || *first.Students[0].Final != 80 || first.Students[1].Final != nil || *first.Students[2].Final != 60 {
		t.Fatalf("late enrollment / previous submission: %+v", first.Students)
	}
	if preview().Fingerprint != first.Fingerprint {
		t.Fatal("unchanged preview became stale")
	}
	input := GradeFinalizeRequest{Title: "期末成绩", Fingerprint: first.Fingerprint, Options: options}
	if err := db.Model(&models.ClassroomHomeworkSubmission{}).Where("student_id = ?", 3).Update("score", 70).Error; err != nil {
		t.Fatal(err)
	}
	request(1, "POST", "one/grade-records", input, 409)
	input.Fingerprint = preview().Fingerprint
	var saved struct {
		Data GradeRecordResponse `json:"data"`
	}
	if err := json.Unmarshal(request(1, "POST", "one/grade-records", input, 200).Body.Bytes(), &saved); err != nil {
		t.Fatal(err)
	}
	if *saved.Data.Report.Students[0].Final != 70 {
		t.Fatal("wrong finalized score")
	}
	path := "one/grade-records/" + saved.Data.ID
	before := request(1, "GET", path, nil, 200).Body.Bytes()
	workbook := request(1, "GET", path+"/export", nil, 200)
	if workbook.Header().Get("Cache-Control") != "no-store" {
		t.Fatal("missing private response cache policy")
	}
	x, err := excelize.OpenReader(bytes.NewReader(workbook.Body.Bytes()))
	if err != nil {
		t.Fatal(err)
	}
	defer x.Close()
	rows, err := x.GetRows("综合成绩")
	if err != nil {
		t.Fatal(err)
	}
	finalColumn := slices.Index(rows[0], "最终得分")
	if finalColumn < 0 || rows[1][finalColumn] != "70" {
		t.Fatalf("workbook score: %+v", rows)
	}
	if _, err := x.GetRows("作业成绩明细"); err != nil {
		t.Fatalf("missing evidence sheet: %v", err)
	}
	for _, actor := range []uint{2, 3} {
		status := 404
		if actor == 3 {
			status = 403
		}
		request(actor, "POST", "one/grade-preview", options, status)
		request(actor, "POST", "one/grade-records", input, status)
		request(actor, "GET", "one/grade-records", nil, status)
		request(actor, "GET", path, nil, status)
		request(actor, "GET", path+"/export", nil, status)
	}
	request(1, "GET", "two/grade-records/"+saved.Data.ID, nil, 404)
	request(1, "GET", "two/grade-records/"+saved.Data.ID+"/export", nil, 404)
	options.IncludeOngoing = true
	request(1, "POST", "one/grade-preview", options, 400)
	if err := db.Model(&models.ClassroomHomeworkSubmission{}).Where("student_id = ?", 3).Update("score", 20).Error; err != nil {
		t.Fatal(err)
	}
	if err := db.Where("student_id = ?", 3).Delete(&models.ClassroomStudent{}).Error; err != nil {
		t.Fatal(err)
	}
	if err := db.Delete(&models.ClassroomHomework{}, 1).Error; err != nil {
		t.Fatal(err)
	}
	if !bytes.Equal(before, request(1, "GET", path, nil, 200).Body.Bytes()) {
		t.Fatal("saved roster or score changed")
	}
	if !bytes.Equal(workbook.Body.Bytes(), request(1, "GET", path+"/export", nil, 200).Body.Bytes()) {
		t.Fatal("original workbook changed")
	}
	stored, err := repo.GetGradeRecord(context.Background(), 1, saved.Data.ID)
	if err != nil {
		t.Fatal(err)
	}
	if err := repo.SaveGradeRecord(context.Background(), *stored); err == nil {
		t.Fatal("snapshot can be overwritten")
	}
	var listing struct {
		Data GradeRecordListResponse `json:"data"`
	}
	if err := json.Unmarshal(request(1, "GET", "one/grade-records", nil, 200).Body.Bytes(), &listing); err != nil {
		t.Fatal(err)
	}
	if len(listing.Data.Records) != 1 {
		t.Fatalf("unexpected records: %+v", listing.Data)
	}
}
