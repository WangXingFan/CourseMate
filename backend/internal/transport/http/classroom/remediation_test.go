package classroom

import (
	"context"
	"encoding/json"
	"testing"

	app "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/application/classroom"
	domain "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/classroom"
	user "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/user"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/infra/persistence/models"
	classrepo "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/infra/persistence/postgres/classroom"
)

func TestRemediationRecipientsCopyAndGradeIsolation(t *testing.T) {
	db, request := homeworkHTTPFixture(t)
	if err := db.AutoMigrate(&models.ClassroomQuiz{}, &models.ClassroomQuizSubmission{}); err != nil {
		t.Fatal(err)
	}
	if err := db.Create(&models.User{BaseModel: models.BaseModel{ID: 5}, PublicID: "unassigned", Username: "unassigned", Role: "student"}).Error; err != nil {
		t.Fatal(err)
	}
	if err := db.Create(&models.ClassroomStudent{ClassroomID: 1, StudentID: 5}).Error; err != nil {
		t.Fatal(err)
	}
	if err := db.Create(&models.Classroom{ControlPlaneModel: models.ControlPlaneModel{ID: 3}, PublicID: "target", TeacherID: 1, Name: "Target"}).Error; err != nil {
		t.Fatal(err)
	}
	if err := db.Model(&models.ClassroomStudent{}).Where("student_id = ?", 3).Update("classroom_id", 3).Error; err != nil {
		t.Fatal(err)
	}
	var bank struct {
		Data RemediationBankResponse `json:"data"`
	}
	if err := json.Unmarshal(request(1, "GET", "/classrooms/class/remediation-bank?conceptId=lesson:ss-1-1", nil, 200).Body.Bytes(), &bank); err != nil {
		t.Fatal(err)
	}
	request(4, "GET", "/classrooms/class/remediation-bank?conceptId=lesson:ss-1-1", nil, 403)
	request(2, "GET", "/classrooms/class/remediation-bank?conceptId=lesson:ss-1-1", nil, 404)
	q := bank.Data.Questions[0]
	input := RemediationRequest{Title: "Consolidation", ConceptID: "lesson:ss-1-1", QuestionIDs: []string{q.ID}, StudentIDs: []string{"otherstudent"}}
	request(1, "POST", "/classrooms/class/remediations", input, 400)
	input.StudentIDs = []string{"student"}
	var created struct {
		Data QuizDataResponse `json:"data"`
	}
	if err := json.Unmarshal(request(1, "POST", "/classrooms/class/remediations", input, 200).Body.Bytes(), &created); err != nil {
		t.Fatal(err)
	}
	quiz := created.Data.Quiz
	if quiz.Purpose != "remediation" || quiz.TargetCount != 1 || quiz.Status != "draft" {
		t.Fatalf("bad draft: %+v", quiz)
	}
	request(1, "POST", "/quizzes/"+quiz.ID+"/open", nil, 200)
	// Use real persistence to check both visibility and direct submission authorization.
	svc := app.NewService(classrepo.NewRepo(db), handlerTestUsers{1: {ID: 1, PublicID: "teacher", Role: user.RoleTeacher}, 4: {ID: 4, PublicID: "student", Role: user.RoleStudent}, 5: {ID: 5, PublicID: "unassigned", Role: user.RoleStudent}})
	ctx := context.Background()
	_, tasks, err := svc.StudentQuizzes(ctx, 5)
	if err != nil || len(tasks) != 0 {
		t.Fatalf("task leaked to unassigned student: %+v %v", tasks, err)
	}
	if _, err = svc.SubmitQuiz(ctx, 5, quiz.ID, []int{0}, nil); err == nil {
		t.Fatal("unassigned student submitted")
	}
	answers := []int{q.Answer}
	fields := map[string]map[string]string{}
	if len(q.Options) == 0 {
		t.Fatal("expected a choice question fixture")
	}
	request(4, "POST", "/quizzes/"+quiz.ID+"/submissions", SubmitQuizRequest{Answers: answers, FieldAnswers: fields}, 200)
	var report struct {
		Data QuizReportResponse `json:"data"`
	}
	if err := json.Unmarshal(request(1, "GET", "/quizzes/"+quiz.ID+"/submissions", nil, 200).Body.Bytes(), &report); err != nil {
		t.Fatal(err)
	}
	if len(report.Data.Students) != 1 || len(report.Data.Submissions) != 1 || len(report.Data.Missing) != 0 {
		t.Fatalf("wrong cohort: %+v", report.Data)
	}
	request(1, "POST", "/quizzes/"+quiz.ID+"/close", nil, 200)
	grades, err := svc.Performance(ctx, 1, "class", domain.PerformanceOptions{})
	if err != nil || len(grades.Activities) != 0 {
		t.Fatalf("remediation affected grades: %+v %v", grades, err)
	}
	copyRequest := CopyQuizRequest{ClassroomID: "otherclass", Title: "Copy", StudentIDs: []string{"otherstudent"}}
	request(1, "POST", "/quizzes/"+quiz.ID+"/copy", copyRequest, 404)
	copyRequest.ClassroomID = "target"
	copyRequest.StudentIDs = []string{"student"}
	request(1, "POST", "/quizzes/"+quiz.ID+"/copy", copyRequest, 400)
	copyRequest.StudentIDs = []string{"otherstudent"}
	var copied struct {
		Data QuizDataResponse `json:"data"`
	}
	if err := json.Unmarshal(request(1, "POST", "/quizzes/"+quiz.ID+"/copy", copyRequest, 200).Body.Bytes(), &copied); err != nil {
		t.Fatal(err)
	}
	if copied.Data.Quiz.ID == quiz.ID || copied.Data.Quiz.Status != "draft" || copied.Data.Quiz.Questions[0].Prompt != q.Prompt || copied.Data.Quiz.SubmissionCount != 0 {
		t.Fatal("copy did not preserve independent snapshot")
	}
}
