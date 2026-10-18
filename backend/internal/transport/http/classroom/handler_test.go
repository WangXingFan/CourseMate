package classroom

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	appclassroom "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/application/classroom"
	domainclassroom "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/classroom"
	domainuser "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/user"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/repository"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/transport/http/middleware"
	"github.com/gin-gonic/gin"
)

type handlerTestUsers map[uint]domainuser.User

func (u handlerTestUsers) GetByID(_ context.Context, id uint) (*domainuser.User, error) {
	item, ok := u[id]
	if !ok {
		return nil, repository.ErrNotFound
	}
	copy := item
	return &copy, nil
}

type handlerTestRepository struct {
	classrooms  []domainclassroom.Classroom
	createInput domainclassroom.Classroom
	quizzes     []domainclassroom.Quiz
	submissions []domainclassroom.QuizSubmission
	memberships map[uint]uint
	addCalls    []handlerTestAddCall
	addErr      error
}

type handlerTestAddCall struct {
	classroomID uint
	teacherID   uint
	username    string
}

func (r *handlerTestRepository) ListClassrooms(_ context.Context, actorID uint, ownedOnly bool) ([]domainclassroom.Classroom, error) {
	items := make([]domainclassroom.Classroom, 0, len(r.classrooms))
	for _, item := range r.classrooms {
		if !ownedOnly || item.TeacherID == actorID {
			items = append(items, item)
		}
	}
	return items, nil
}

func (r *handlerTestRepository) CreateClassroom(_ context.Context, input domainclassroom.Classroom) (*domainclassroom.Classroom, error) {
	r.createInput = input
	input.ID = 1
	input.CreatedAt = time.Date(2026, time.October, 18, 8, 0, 0, 0, time.UTC)
	return &input, nil
}

func (r *handlerTestRepository) GetClassroom(_ context.Context, publicID string) (*domainclassroom.Classroom, error) {
	return r.find(publicID, 0)
}

func (r *handlerTestRepository) GetOwnedClassroom(_ context.Context, publicID string, teacherID uint) (*domainclassroom.Classroom, error) {
	return r.find(publicID, teacherID)
}

func (r *handlerTestRepository) find(publicID string, teacherID uint) (*domainclassroom.Classroom, error) {
	for _, item := range r.classrooms {
		if item.PublicID == publicID && (teacherID == 0 || item.TeacherID == teacherID) {
			copy := item
			return &copy, nil
		}
	}
	return nil, repository.ErrNotFound
}

func (r *handlerTestRepository) UpdateClassroom(context.Context, string, uint, string, string) error {
	return nil
}

func (r *handlerTestRepository) DeleteClassroom(context.Context, string, uint) error {
	return nil
}

func (r *handlerTestRepository) ListClassroomStudents(context.Context, uint) ([]domainclassroom.Student, error) {
	return []domainclassroom.Student{
		{PublicID: "student_4", Username: "student_one", DisplayName: "Student One"},
		{PublicID: "student_6", Username: "student_two", DisplayName: "Student Two"},
	}, nil
}

func (r *handlerTestRepository) AddClassroomStudent(_ context.Context, classroomID, teacherID uint, username string) error {
	r.addCalls = append(r.addCalls, handlerTestAddCall{classroomID: classroomID, teacherID: teacherID, username: username})
	return r.addErr
}

func (r *handlerTestRepository) RemoveClassroomStudent(context.Context, uint, uint, string) error {
	return nil
}

func (r *handlerTestRepository) GetStudentClassroom(_ context.Context, studentID uint) (*domainclassroom.Classroom, error) {
	classroomID, ok := r.memberships[studentID]
	if !ok {
		return nil, repository.ErrNotFound
	}
	for _, item := range r.classrooms {
		if item.ID == classroomID {
			copy := item
			return &copy, nil
		}
	}
	return nil, repository.ErrNotFound
}

func (r *handlerTestRepository) CreateQuiz(_ context.Context, input domainclassroom.Quiz) (*domainclassroom.Quiz, error) {
	input.ID = uint(len(r.quizzes) + 1)
	r.quizzes = append(r.quizzes, input)
	copy := input
	return &copy, nil
}

func (r *handlerTestRepository) ListQuizzes(_ context.Context, classroomID uint) ([]domainclassroom.Quiz, error) {
	items := make([]domainclassroom.Quiz, 0)
	for _, item := range r.quizzes {
		if item.ClassroomID == classroomID {
			items = append(items, item)
		}
	}
	return items, nil
}

func (r *handlerTestRepository) GetQuiz(_ context.Context, publicID string) (*domainclassroom.Quiz, error) {
	return r.findQuiz(publicID, 0)
}

func (r *handlerTestRepository) GetOwnedQuiz(_ context.Context, publicID string, teacherID uint) (*domainclassroom.Quiz, error) {
	return r.findQuiz(publicID, teacherID)
}

func (r *handlerTestRepository) findQuiz(publicID string, teacherID uint) (*domainclassroom.Quiz, error) {
	for index := range r.quizzes {
		item := &r.quizzes[index]
		if item.PublicID == publicID && (teacherID == 0 || item.TeacherID == teacherID) {
			copy := *item
			return &copy, nil
		}
	}
	return nil, repository.ErrNotFound
}

func (r *handlerTestRepository) UpdateQuizStatus(_ context.Context, publicID string, teacherID uint, status string) error {
	for index := range r.quizzes {
		item := &r.quizzes[index]
		if item.PublicID == publicID && item.TeacherID == teacherID {
			item.Status = status
			return nil
		}
	}
	return repository.ErrNotFound
}

func (r *handlerTestRepository) ListStudentQuizzes(_ context.Context, classroomID, studentID uint) ([]domainclassroom.Quiz, error) {
	items := make([]domainclassroom.Quiz, 0)
	for _, item := range r.quizzes {
		if item.ClassroomID != classroomID || item.Status != domainclassroom.QuizStatusOpen {
			continue
		}
		for _, submission := range r.submissions {
			if submission.QuizID == item.ID && submission.StudentID == studentID {
				item.Submitted = true
				item.Score = submission.Score
				item.Answers = append([]int(nil), submission.Answers...)
			}
		}
		item.Questions = cloneHandlerQuizQuestions(item.Questions)
		items = append(items, item)
	}
	return items, nil
}

func cloneHandlerQuizQuestions(questions []domainclassroom.QuizQuestion) []domainclassroom.QuizQuestion {
	cloned := make([]domainclassroom.QuizQuestion, len(questions))
	for index, question := range questions {
		cloned[index] = question
		cloned[index].Options = append([]string(nil), question.Options...)
	}
	return cloned
}

func (r *handlerTestRepository) CreateQuizSubmission(_ context.Context, input domainclassroom.QuizSubmission) error {
	for _, submission := range r.submissions {
		if submission.QuizID == input.QuizID && submission.StudentID == input.StudentID {
			return repository.ErrConflict
		}
	}
	input.ID = uint(len(r.submissions) + 1)
	input.StudentPublicID = fmt.Sprintf("student_%d", input.StudentID)
	r.submissions = append(r.submissions, input)
	return nil
}

func (r *handlerTestRepository) ListQuizSubmissions(_ context.Context, quizID uint) ([]domainclassroom.QuizSubmission, error) {
	items := make([]domainclassroom.QuizSubmission, 0)
	for _, item := range r.submissions {
		if item.QuizID == quizID {
			items = append(items, item)
		}
	}
	return items, nil
}

func newClassroomHandlerTest(t *testing.T) (*gin.Engine, *handlerTestRepository) {
	t.Helper()
	gin.SetMode(gin.TestMode)
	repo := &handlerTestRepository{classrooms: []domainclassroom.Classroom{{
		ID: 10, PublicID: "class_one", TeacherID: 1, TeacherName: "Teacher One", Name: "Algebra", Description: "Morning", StudentCount: 2,
		CreatedAt: time.Date(2026, time.October, 18, 8, 0, 0, 0, time.UTC),
	}}, memberships: map[uint]uint{1: 10, 4: 10}}
	users := handlerTestUsers{
		1: {ID: 1, Username: "teacher", Role: domainuser.RoleTeacher},
		3: {ID: 3, Username: "admin", Role: domainuser.RoleAdmin},
		4: {ID: 4, Username: "student_one", Role: domainuser.RoleStudent},
	}
	handler := NewHandler(appclassroom.NewService(repo, users))
	router := gin.New()
	api := router.Group("/api/v1", func(c *gin.Context) {
		userID := uint(1)
		if c.GetHeader("X-Test-User-ID") == "3" {
			userID = 3
		}
		if c.GetHeader("X-Test-User-ID") == "4" {
			userID = 4
		}
		c.Set(middleware.ContextKeyUserID, userID)
		c.Set(middleware.ContextKeyRequestID, "req_test")
		c.Next()
	})
	NewModule(handler).RegisterRoutes(api)
	return router, repo
}

func performClassroomRequest(router http.Handler, method, path, body string, userID uint) *httptest.ResponseRecorder {
	request := httptest.NewRequest(method, path, bytes.NewBufferString(body))
	request.Header.Set("Content-Type", "application/json")
	recorder := httptest.NewRecorder()
	if userID != 0 {
		request.Header.Set("X-Test-User-ID", fmt.Sprint(userID))
	}
	router.ServeHTTP(recorder, request)
	return recorder
}

func TestListClassroomsSerializesClassroomView(t *testing.T) {
	router, _ := newClassroomHandlerTest(t)
	recorder := performClassroomRequest(router, http.MethodGet, "/api/v1/classrooms", "", 0)
	if recorder.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", recorder.Code, recorder.Body.String())
	}
	var payload struct {
		Data ClassroomListResponse `json:"data"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if len(payload.Data.Classrooms) != 1 {
		t.Fatalf("classrooms = %#v", payload.Data.Classrooms)
	}
	item := payload.Data.Classrooms[0]
	if item.ID != "class_one" || item.TeacherName != "Teacher One" || item.StudentCount != 2 {
		t.Fatalf("classroom = %#v", item)
	}
}

func TestCreateClassroomNormalizesRequest(t *testing.T) {
	router, repo := newClassroomHandlerTest(t)
	recorder := performClassroomRequest(router, http.MethodPost, "/api/v1/classrooms", `{"name":"  Algebra 1  ","description":"  Monday cohort  "}`, 0)
	if recorder.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", recorder.Code, recorder.Body.String())
	}
	if repo.createInput.Name != "Algebra 1" || repo.createInput.Description != "Monday cohort" {
		t.Fatalf("create input = %#v", repo.createInput)
	}
	if repo.createInput.PublicID == "" || repo.createInput.TeacherID != 1 {
		t.Fatalf("create identity = %q/%d", repo.createInput.PublicID, repo.createInput.TeacherID)
	}
}

func TestAddStudentNormalizesUsernameAndMapsConflict(t *testing.T) {
	router, repo := newClassroomHandlerTest(t)
	recorder := performClassroomRequest(router, http.MethodPost, "/api/v1/classrooms/class_one/students", `{"username":"  S20260001  "}`, 0)
	if recorder.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", recorder.Code, recorder.Body.String())
	}
	if len(repo.addCalls) != 1 || repo.addCalls[0].username != "s20260001" || repo.addCalls[0].classroomID != 10 {
		t.Fatalf("add call = %#v", repo.addCalls)
	}

	repo.addErr = repository.ErrConflict
	recorder = performClassroomRequest(router, http.MethodPost, "/api/v1/classrooms/class_one/students", `{"username":"student_two"}`, 0)
	if recorder.Code != http.StatusConflict || !strings.Contains(recorder.Body.String(), "classroom.student_assigned") {
		t.Fatalf("conflict status/body = %d/%s", recorder.Code, recorder.Body.String())
	}
}

func TestAdministratorCanReadButCannotMutateClassrooms(t *testing.T) {
	router, _ := newClassroomHandlerTest(t)
	list := performClassroomRequest(router, http.MethodGet, "/api/v1/classrooms", "", 3)
	if list.Code != http.StatusOK || !strings.Contains(list.Body.String(), "class_one") {
		t.Fatalf("admin list status/body = %d/%s", list.Code, list.Body.String())
	}

	update := performClassroomRequest(router, http.MethodPatch, "/api/v1/classrooms/class_one", `{"name":"Changed","description":""}`, 3)
	if update.Code != http.StatusForbidden || !strings.Contains(update.Body.String(), "classroom.forbidden") {
		t.Fatalf("admin update status/body = %d/%s", update.Code, update.Body.String())
	}
}

func TestClassroomHandlersRejectBlankPathIDs(t *testing.T) {
	router, _ := newClassroomHandlerTest(t)
	classroom := performClassroomRequest(router, http.MethodDelete, "/api/v1/classrooms/%20", "", 0)
	if classroom.Code != http.StatusBadRequest || !strings.Contains(classroom.Body.String(), "classroom.invalid_id") {
		t.Fatalf("classroom id status/body = %d/%s", classroom.Code, classroom.Body.String())
	}

	student := performClassroomRequest(router, http.MethodDelete, "/api/v1/classrooms/class_one/students/%20", "", 0)
	if student.Code != http.StatusBadRequest || !strings.Contains(student.Body.String(), "classroom.invalid_student_id") {
		t.Fatalf("student id status/body = %d/%s", student.Code, student.Body.String())
	}
}

func TestQuizRoutesCreatePublishSubmitAndReport(t *testing.T) {
	router, _ := newClassroomHandlerTest(t)
	create := performClassroomRequest(
		router,
		http.MethodPost,
		"/api/v1/classrooms/class_one/quizzes",
		`{"title":"Warm-up","phase":"pre_class","questions":[{"prompt":"Q1","options":["A","B"],"answer":1},{"prompt":"Q2","options":["A","B"],"answer":0}]}`,
		0,
	)
	if create.Code != http.StatusOK {
		t.Fatalf("create status = %d, body = %s", create.Code, create.Body.String())
	}
	var created struct {
		Data QuizDataResponse `json:"data"`
	}
	if err := json.Unmarshal(create.Body.Bytes(), &created); err != nil {
		t.Fatalf("decode create response: %v", err)
	}
	quizID := created.Data.Quiz.ID
	if quizID == "" || created.Data.Quiz.Status != domainclassroom.QuizStatusDraft {
		t.Fatalf("created quiz = %#v", created.Data.Quiz)
	}
	if created.Data.Quiz.Questions[0].ID != "q1" || created.Data.Quiz.Questions[0].Answer != 1 {
		t.Fatalf("created question = %#v", created.Data.Quiz.Questions[0])
	}

	open := performClassroomRequest(router, http.MethodPost, "/api/v1/quizzes/"+quizID+"/open", "", 0)
	if open.Code != http.StatusOK {
		t.Fatalf("open status = %d, body = %s", open.Code, open.Body.String())
	}

	studentList := performClassroomRequest(router, http.MethodGet, "/api/v1/student/quizzes", "", 4)
	if studentList.Code != http.StatusOK || !strings.Contains(studentList.Body.String(), quizID) {
		t.Fatalf("student list status/body = %d/%s", studentList.Code, studentList.Body.String())
	}
	if strings.Contains(studentList.Body.String(), `"answer"`) {
		t.Fatalf("student quiz leaked answers: %s", studentList.Body.String())
	}

	submit := performClassroomRequest(
		router,
		http.MethodPost,
		"/api/v1/quizzes/"+quizID+"/submissions",
		`{"answers":[1,0]}`,
		4,
	)
	if submit.Code != http.StatusOK || !strings.Contains(submit.Body.String(), `"score":2`) {
		t.Fatalf("submit status/body = %d/%s", submit.Code, submit.Body.String())
	}

	duplicate := performClassroomRequest(
		router,
		http.MethodPost,
		"/api/v1/quizzes/"+quizID+"/submissions",
		`{"answers":[1,0]}`,
		4,
	)
	if duplicate.Code != http.StatusConflict || !strings.Contains(duplicate.Body.String(), "classroom.quiz_already_submitted") {
		t.Fatalf("duplicate status/body = %d/%s", duplicate.Code, duplicate.Body.String())
	}

	report := performClassroomRequest(router, http.MethodGet, "/api/v1/quizzes/"+quizID+"/submissions", "", 0)
	if report.Code != http.StatusOK {
		t.Fatalf("report status = %d, body = %s", report.Code, report.Body.String())
	}
	var reportPayload struct {
		Data QuizReportResponse `json:"data"`
	}
	if err := json.Unmarshal(report.Body.Bytes(), &reportPayload); err != nil {
		t.Fatalf("decode report: %v", err)
	}
	if reportPayload.Data.Statistics.SubmissionCount != 1 || len(reportPayload.Data.Missing) != 1 {
		t.Fatalf("report payload = %#v", reportPayload.Data)
	}

	closeQuiz := performClassroomRequest(router, http.MethodPost, "/api/v1/quizzes/"+quizID+"/close", "", 0)
	if closeQuiz.Code != http.StatusOK {
		t.Fatalf("close status = %d, body = %s", closeQuiz.Code, closeQuiz.Body.String())
	}
}
