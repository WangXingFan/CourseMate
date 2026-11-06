package knowledgebase

import (
	"context"
	"errors"
	"testing"

	appknowledgebase "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/application/knowledgebase"
	appupload "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/application/upload"
	domainknowledgebase "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/knowledgebase"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/infra/persistence/models"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func TestTeacherKnowledgeBaseAccess(t *testing.T) {
	db, err := gorm.Open(sqlite.Open("file:"+t.Name()+"?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatal(err)
	}
	sqlDB, _ := db.DB()
	t.Cleanup(func() { _ = sqlDB.Close() })
	if err := db.AutoMigrate(&models.User{}, &models.Classroom{}, &models.ClassroomStudent{}, &models.KnowledgeBase{}, &models.KnowledgeBaseFile{}, &models.FileObject{}); err != nil {
		t.Fatal(err)
	}
	teacher := models.User{PublicID: "teacher", Username: "teacher", Role: models.RoleTeacher}
	if err := db.Create(&teacher).Error; err != nil {
		t.Fatal(err)
	}
	classroom := models.Classroom{PublicID: "class", TeacherID: teacher.ID, Name: "Class"}
	if err := db.Create(&classroom).Error; err != nil {
		t.Fatal(err)
	}
	const studentID, outsiderID = uint(21), uint(22)
	membership := models.ClassroomStudent{StudentID: studentID, ClassroomID: classroom.ID}
	if err := db.Create(&membership).Error; err != nil {
		t.Fatal(err)
	}
	service := appknowledgebase.NewService(NewRepo(db))
	ctx := context.Background()
	base, err := service.CreateUser(ctx, teacher.ID, appknowledgebase.WriteInput{Name: "Teacher notes"})
	if err != nil {
		t.Fatal(err)
	}
	privateBase, err := service.CreateUser(ctx, outsiderID, appknowledgebase.WriteInput{Name: "Private notes"})
	if err != nil {
		t.Fatal(err)
	}
	file := models.FileObject{FileID: "teacher-file", UserID: teacher.ID, FileName: "notes.md", Status: "active", ProcessingReady: true, EmbedStatus: "ready", ChunkCount: 2}
	if err := db.Create(&file).Error; err != nil {
		t.Fatal(err)
	}
	if err := service.AddUserFiles(ctx, teacher.ID, base.PublicID, []string{file.FileID}); err != nil {
		t.Fatal(err)
	}
	opener := &teacherFileOpener{}
	service.SetFileContentOpener(opener)

	for _, userID := range []uint{teacher.ID, studentID} {
		items, total, err := service.ListVisible(ctx, userID, appknowledgebase.ListInput{Query: "Teacher", Sort: "files", PageSize: 1})
		if err != nil || total != 1 || len(items) != 1 || items[0].PublicID != base.PublicID {
			t.Fatalf("list for %d = %v, total %d, %v", userID, items, total, err)
		}
		if _, err := service.GetVisible(ctx, userID, base.PublicID); err != nil {
			t.Fatalf("detail for %d: %v", userID, err)
		}
		if files, total, err := service.ListVisibleFiles(ctx, userID, base.PublicID, 1, 20); err != nil || total != 1 || len(files) != 1 {
			t.Fatalf("files for %d: %v, %d, %v", userID, files, total, err)
		}
		if _, err := service.GetVisibleFileProcessingStatuses(ctx, userID, base.PublicID, []string{file.FileID}); err != nil {
			t.Fatalf("statuses: %v", err)
		}
		if snapshot, _, err := service.GetVisibleFileProcessingSnapshot(ctx, userID, base.PublicID, nil); err != nil || snapshot.ReadyFileCount != 1 {
			t.Fatalf("snapshot: %v, %v", snapshot, err)
		}
		if _, err := service.OpenVisibleFileContent(ctx, userID, base.PublicID, file.FileID); err != nil || opener.ownerID != teacher.ID {
			t.Fatalf("preview must use teacher's file ownership: %d, %v", opener.ownerID, err)
		}
		if _, files, err := service.ResolveFiles(ctx, userID, []string{base.PublicID}); err != nil || len(files) != 1 {
			t.Fatalf("retrieval: %v, %v", files, err)
		}
	}

	items, total, err := service.ListAdmin(ctx, appknowledgebase.ListInput{})
	if err != nil || total != 1 || len(items) != 1 || items[0].PublicID != base.PublicID {
		t.Fatalf("admin list: %v, %d, %v", items, total, err)
	}
	if _, err := service.GetAdmin(ctx, base.PublicID); err != nil {
		t.Fatal(err)
	}
	if _, total, err := service.ListAdminFiles(ctx, base.PublicID, 1, 20); err != nil || total != 1 {
		t.Fatalf("admin files: %d, %v", total, err)
	}
	if _, err := service.OpenAdminFileContent(ctx, base.PublicID, file.FileID); err != nil || opener.ownerID != teacher.ID {
		t.Fatalf("admin preview: %d, %v", opener.ownerID, err)
	}
	if _, err := service.GetAdminFileProcessingStatuses(ctx, base.PublicID, []string{file.FileID}); err != nil {
		t.Fatal(err)
	}
	if _, _, err := service.GetAdminFileProcessingSnapshot(ctx, base.PublicID, nil); err != nil {
		t.Fatal(err)
	}
	if _, err := service.GetAdmin(ctx, privateBase.PublicID); !errors.Is(err, appknowledgebase.ErrKnowledgeBaseNotFound) {
		t.Fatalf("admin must not expose ordinary personal libraries: %v", err)
	}
	name := "Student edit"
	if _, err := service.UpdateUser(ctx, studentID, base.PublicID, appknowledgebase.PatchInput{Name: &name}); !errors.Is(err, appknowledgebase.ErrKnowledgeBaseNotFound) {
		t.Fatalf("student update: %v", err)
	}
	if err := service.RemoveUserFile(ctx, studentID, base.PublicID, file.FileID); !errors.Is(err, appknowledgebase.ErrKnowledgeBaseNotFound) {
		t.Fatalf("student file removal: %v", err)
	}
	if _, err := service.UpdateBuiltin(ctx, 99, base.PublicID, appknowledgebase.PatchInput{Name: &name}); !errors.Is(err, appknowledgebase.ErrKnowledgeBaseNotFound) {
		t.Fatalf("teacher library remains teacher-managed: %v", err)
	}

	assertDenied := func(userID uint) {
		t.Helper()
		if items, total, err := service.ListVisible(ctx, userID, appknowledgebase.ListInput{IDs: []string{base.PublicID}}); err != nil || total != 0 || len(items) != 0 {
			t.Fatalf("unauthorized list: %v, %d, %v", items, total, err)
		}
		if _, err := service.GetVisible(ctx, userID, base.PublicID); !errors.Is(err, appknowledgebase.ErrKnowledgeBaseNotFound) {
			t.Fatalf("unauthorized detail: %v", err)
		}
		if _, err := service.OpenVisibleFileContent(ctx, userID, base.PublicID, file.FileID); !errors.Is(err, appknowledgebase.ErrKnowledgeBaseNotFound) {
			t.Fatalf("unauthorized preview: %v", err)
		}
		if _, _, err := service.GetVisibleFileProcessingSnapshot(ctx, userID, base.PublicID, nil); !errors.Is(err, appknowledgebase.ErrKnowledgeBaseNotFound) {
			t.Fatalf("unauthorized snapshot: %v", err)
		}
		if _, _, err := service.ResolveFiles(ctx, userID, []string{base.PublicID}); !errors.Is(err, domainknowledgebase.ErrReferenceUnavailable) {
			t.Fatalf("unauthorized retrieval: %v", err)
		}
	}
	assertDenied(outsiderID)
	if err := db.Delete(&membership).Error; err != nil {
		t.Fatal(err)
	}
	assertDenied(studentID)
	if err := db.Create(&membership).Error; err != nil {
		t.Fatal(err)
	}
	if err := db.Model(&models.KnowledgeBase{}).Where("id = ?", base.ID).Update("enabled", false).Error; err != nil {
		t.Fatal(err)
	}
	assertDenied(studentID)
	if _, err := service.GetAdmin(ctx, base.PublicID); err != nil {
		t.Fatalf("admin can inspect disabled teacher library: %v", err)
	}
}

type teacherFileOpener struct{ ownerID uint }

func (o *teacherFileOpener) OpenFileContent(_ context.Context, userID uint, _ string) (*appupload.FileContentResult, error) {
	o.ownerID = userID
	return &appupload.FileContentResult{}, nil
}
