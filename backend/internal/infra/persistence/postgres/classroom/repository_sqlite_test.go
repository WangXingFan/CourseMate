package classroom

import (
	"context"
	"errors"
	"strings"
	"testing"

	domainmodel "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/classroom"
	domainuser "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/user"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/infra/persistence/models"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/repository"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func TestClassroomRepositoryLifecycleAndGlobalStudentMembership(t *testing.T) {
	dbName := strings.NewReplacer("/", "_", " ", "_").Replace(t.Name())
	db, err := gorm.Open(sqlite.Open("file:"+dbName+"?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	if err = db.AutoMigrate(
		&models.User{},
		&models.Classroom{},
		&models.ClassroomStudent{},
		&models.ClassroomQuiz{},
		&models.ClassroomQuizSubmission{},
	); err != nil {
		t.Fatalf("migrate: %v", err)
	}

	users := []models.User{
		{PublicID: "teacher_one", Username: "teacher_one", DisplayName: "Teacher One", Role: domainuser.RoleTeacher, Status: domainuser.StatusActive},
		{PublicID: "teacher_two", Username: "teacher_two", DisplayName: "Teacher Two", Role: domainuser.RoleTeacher, Status: domainuser.StatusActive},
		{PublicID: "student_one", Username: "s20260001", DisplayName: "Student One", Role: domainuser.RoleStudent, Status: domainuser.StatusActive},
	}
	if err = db.Create(&users).Error; err != nil {
		t.Fatalf("seed users: %v", err)
	}
	repo := NewRepo(db)
	ctx := context.Background()
	first, err := repo.CreateClassroom(ctx, domainClassroom("class_one", users[0].ID, "Class One"))
	if err != nil {
		t.Fatalf("CreateClassroom(first) error = %v", err)
	}
	second, err := repo.CreateClassroom(ctx, domainClassroom("class_two", users[0].ID, "Class Two"))
	if err != nil {
		t.Fatalf("CreateClassroom(second) error = %v", err)
	}
	if first.TeacherName != "Teacher One" {
		t.Fatalf("teacher name = %q, want display name", first.TeacherName)
	}
	if _, err = repo.GetOwnedClassroom(ctx, first.PublicID, users[1].ID); !errors.Is(err, repository.ErrNotFound) {
		t.Fatalf("cross-teacher GetOwnedClassroom() error = %v, want ErrNotFound", err)
	}

	if err = repo.AddClassroomStudent(ctx, first.ID, users[0].ID, users[2].Username); err != nil {
		t.Fatalf("AddClassroomStudent() error = %v", err)
	}
	if err = repo.AddClassroomStudent(ctx, second.ID, users[0].ID, users[2].Username); !errors.Is(err, repository.ErrConflict) {
		t.Fatalf("duplicate assignment error = %v, want ErrConflict", err)
	}
	if err = db.Create(&models.ClassroomStudent{StudentID: users[2].ID, ClassroomID: second.ID}).Error; err == nil {
		t.Fatal("database accepted a second membership for the same student")
	}

	students, err := repo.ListClassroomStudents(ctx, first.ID)
	if err != nil || len(students) != 1 || students[0].Username != users[2].Username || students[0].PublicID != users[2].PublicID {
		t.Fatalf("ListClassroomStudents() = %#v, %v, want seeded student", students, err)
	}
	if err = repo.AddClassroomStudent(ctx, second.ID, users[1].ID, users[2].Username); !errors.Is(err, repository.ErrNotFound) {
		t.Fatalf("cross-teacher AddClassroomStudent() error = %v, want ErrNotFound", err)
	}

	quiz, err := repo.CreateQuiz(ctx, domainmodel.Quiz{
		PublicID:    "quiz_one",
		ClassroomID: first.ID,
		TeacherID:   users[0].ID,
		Title:       "Warm-up",
		Phase:       domainmodel.QuizPhasePreClass,
		Status:      domainmodel.QuizStatusDraft,
		Questions: []domainmodel.QuizQuestion{
			{ID: "q1", Prompt: "Q1", Options: []string{"A", "B"}, Answer: 1},
		},
	})
	if err != nil {
		t.Fatalf("CreateQuiz() error = %v", err)
	}
	if _, err = repo.GetOwnedQuiz(ctx, quiz.PublicID, users[1].ID); !errors.Is(err, repository.ErrNotFound) {
		t.Fatalf("cross-teacher GetOwnedQuiz() error = %v, want ErrNotFound", err)
	}
	if err = repo.UpdateQuizStatus(ctx, quiz.PublicID, users[0].ID, domainmodel.QuizStatusOpen); err != nil {
		t.Fatalf("UpdateQuizStatus() error = %v", err)
	}
	studentQuizzes, err := repo.ListStudentQuizzes(ctx, first.ID, users[2].ID)
	if err != nil || len(studentQuizzes) != 1 || studentQuizzes[0].PublicID != quiz.PublicID {
		t.Fatalf("ListStudentQuizzes() = %#v, %v", studentQuizzes, err)
	}
	if err = repo.CreateQuizSubmission(ctx, domainmodel.QuizSubmission{
		QuizID: quiz.ID, StudentID: users[2].ID, Answers: []int{1}, Score: 1,
	}); err != nil {
		t.Fatalf("CreateQuizSubmission() error = %v", err)
	}
	if err = repo.CreateQuizSubmission(ctx, domainmodel.QuizSubmission{
		QuizID: quiz.ID, StudentID: users[2].ID, Answers: []int{0}, Score: 0,
	}); !errors.Is(err, repository.ErrConflict) {
		t.Fatalf("duplicate CreateQuizSubmission() error = %v, want ErrConflict", err)
	}
	submissions, err := repo.ListQuizSubmissions(ctx, quiz.ID)
	if err != nil || len(submissions) != 1 || submissions[0].StudentPublicID != users[2].PublicID || submissions[0].Score != 1 {
		t.Fatalf("ListQuizSubmissions() = %#v, %v", submissions, err)
	}

	if err = repo.DeleteClassroom(ctx, first.PublicID, users[0].ID); err != nil {
		t.Fatalf("DeleteClassroom() error = %v", err)
	}
	var membershipCount int64
	if err = db.Model(&models.ClassroomStudent{}).Where("student_id = ?", users[2].ID).Count(&membershipCount).Error; err != nil {
		t.Fatalf("count memberships: %v", err)
	}
	if membershipCount != 0 {
		t.Fatalf("membership count after classroom delete = %d, want 0", membershipCount)
	}
	var quizCount int64
	if err = db.Model(&models.ClassroomQuiz{}).Count(&quizCount).Error; err != nil {
		t.Fatalf("count quizzes: %v", err)
	}
	var submissionCount int64
	if err = db.Model(&models.ClassroomQuizSubmission{}).Count(&submissionCount).Error; err != nil {
		t.Fatalf("count quiz submissions: %v", err)
	}
	if quizCount != 0 || submissionCount != 0 {
		t.Fatalf("quiz cascade left %d quizzes and %d submissions", quizCount, submissionCount)
	}
	if err = repo.AddClassroomStudent(ctx, second.ID, users[0].ID, users[2].Username); err != nil {
		t.Fatalf("reassign student after delete error = %v", err)
	}
	students, err = repo.ListClassroomStudents(ctx, second.ID)
	if err != nil || len(students) != 1 || students[0].PublicID != users[2].PublicID {
		t.Fatalf("reassigned roster = %#v, %v, want moved student", students, err)
	}
}

func domainClassroom(publicID string, teacherID uint, name string) domainmodel.Classroom {
	return domainmodel.Classroom{PublicID: publicID, TeacherID: teacherID, Name: name}
}
