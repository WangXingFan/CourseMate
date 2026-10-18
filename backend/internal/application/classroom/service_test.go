package classroom

import (
	"context"
	"errors"
	"testing"
	"time"

	domainmodel "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/classroom"
	domainuser "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/user"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/repository"
)

type fakeUserReader struct {
	users map[uint]*domainuser.User
}

func (f fakeUserReader) GetByID(_ context.Context, id uint) (*domainuser.User, error) {
	item, ok := f.users[id]
	if !ok {
		return nil, repository.ErrNotFound
	}
	copy := *item
	return &copy, nil
}

type fakeClassroomRepository struct {
	classrooms    []domainmodel.Classroom
	students      map[uint][]domainmodel.Student
	memberships   map[uint]uint
	quizzes       []domainmodel.Quiz
	submissions   []domainmodel.QuizSubmission
	addErr        error
	listActor     uint
	listOwnedOnly bool
	addCalls      []fakeAddStudentCall
}

type fakeAddStudentCall struct {
	classroomID uint
	teacherID   uint
	username    string
}

func (f *fakeClassroomRepository) ListClassrooms(_ context.Context, actorID uint, ownedOnly bool) ([]domainmodel.Classroom, error) {
	f.listActor = actorID
	f.listOwnedOnly = ownedOnly
	items := make([]domainmodel.Classroom, 0, len(f.classrooms))
	for _, item := range f.classrooms {
		if !ownedOnly || item.TeacherID == actorID {
			items = append(items, item)
		}
	}
	return items, nil
}

func (f *fakeClassroomRepository) CreateClassroom(_ context.Context, input domainmodel.Classroom) (*domainmodel.Classroom, error) {
	input.ID = uint(len(f.classrooms) + 1)
	input.CreatedAt = time.Unix(int64(input.ID), 0)
	f.classrooms = append(f.classrooms, input)
	return &input, nil
}

func (f *fakeClassroomRepository) GetClassroom(_ context.Context, publicID string) (*domainmodel.Classroom, error) {
	return f.findClassroom(publicID, 0)
}

func (f *fakeClassroomRepository) GetOwnedClassroom(_ context.Context, publicID string, teacherID uint) (*domainmodel.Classroom, error) {
	return f.findClassroom(publicID, teacherID)
}

func (f *fakeClassroomRepository) findClassroom(publicID string, teacherID uint) (*domainmodel.Classroom, error) {
	for index := range f.classrooms {
		item := &f.classrooms[index]
		if item.PublicID == publicID && (teacherID == 0 || item.TeacherID == teacherID) {
			copy := *item
			return &copy, nil
		}
	}
	return nil, repository.ErrNotFound
}

func (f *fakeClassroomRepository) UpdateClassroom(_ context.Context, publicID string, teacherID uint, name, description string) error {
	for index := range f.classrooms {
		item := &f.classrooms[index]
		if item.PublicID == publicID && item.TeacherID == teacherID {
			item.Name = name
			item.Description = description
			return nil
		}
	}
	return repository.ErrNotFound
}

func (f *fakeClassroomRepository) DeleteClassroom(_ context.Context, publicID string, teacherID uint) error {
	for index := range f.classrooms {
		item := f.classrooms[index]
		if item.PublicID == publicID && item.TeacherID == teacherID {
			f.classrooms = append(f.classrooms[:index], f.classrooms[index+1:]...)
			delete(f.students, item.ID)
			return nil
		}
	}
	return repository.ErrNotFound
}

func (f *fakeClassroomRepository) ListClassroomStudents(_ context.Context, classroomID uint) ([]domainmodel.Student, error) {
	return append([]domainmodel.Student(nil), f.students[classroomID]...), nil
}

func (f *fakeClassroomRepository) AddClassroomStudent(_ context.Context, classroomID, teacherID uint, username string) error {
	f.addCalls = append(f.addCalls, fakeAddStudentCall{classroomID: classroomID, teacherID: teacherID, username: username})
	return f.addErr
}

func (f *fakeClassroomRepository) RemoveClassroomStudent(_ context.Context, classroomID, teacherID uint, studentPublicID string) error {
	items := f.students[classroomID]
	for index, item := range items {
		if item.PublicID == studentPublicID {
			f.students[classroomID] = append(items[:index], items[index+1:]...)
			return nil
		}
	}
	return repository.ErrNotFound
}

func (f *fakeClassroomRepository) GetStudentClassroom(_ context.Context, studentID uint) (*domainmodel.Classroom, error) {
	classroomID, ok := f.memberships[studentID]
	if !ok {
		return nil, repository.ErrNotFound
	}
	for index := range f.classrooms {
		if f.classrooms[index].ID == classroomID {
			copy := f.classrooms[index]
			return &copy, nil
		}
	}
	return nil, repository.ErrNotFound
}

func (f *fakeClassroomRepository) CreateQuiz(_ context.Context, input domainmodel.Quiz) (*domainmodel.Quiz, error) {
	input.ID = uint(len(f.quizzes) + 1)
	input.CreatedAt = time.Unix(int64(input.ID), 0)
	f.quizzes = append(f.quizzes, input)
	copy := input
	return &copy, nil
}

func (f *fakeClassroomRepository) ListQuizzes(_ context.Context, classroomID uint) ([]domainmodel.Quiz, error) {
	items := make([]domainmodel.Quiz, 0)
	for _, item := range f.quizzes {
		if item.ClassroomID == classroomID {
			items = append(items, item)
		}
	}
	return items, nil
}

func (f *fakeClassroomRepository) GetQuiz(_ context.Context, publicID string) (*domainmodel.Quiz, error) {
	return f.findQuiz(publicID, 0)
}

func (f *fakeClassroomRepository) GetOwnedQuiz(_ context.Context, publicID string, teacherID uint) (*domainmodel.Quiz, error) {
	return f.findQuiz(publicID, teacherID)
}

func (f *fakeClassroomRepository) findQuiz(publicID string, teacherID uint) (*domainmodel.Quiz, error) {
	for index := range f.quizzes {
		item := &f.quizzes[index]
		if item.PublicID == publicID && (teacherID == 0 || item.TeacherID == teacherID) {
			copy := *item
			return &copy, nil
		}
	}
	return nil, repository.ErrNotFound
}

func (f *fakeClassroomRepository) UpdateQuizStatus(_ context.Context, publicID string, teacherID uint, status string) error {
	for index := range f.quizzes {
		item := &f.quizzes[index]
		if item.PublicID == publicID && item.TeacherID == teacherID {
			item.Status = status
			return nil
		}
	}
	return repository.ErrNotFound
}

func (f *fakeClassroomRepository) ListStudentQuizzes(_ context.Context, classroomID, studentID uint) ([]domainmodel.Quiz, error) {
	items := make([]domainmodel.Quiz, 0)
	for _, item := range f.quizzes {
		if item.ClassroomID != classroomID || item.Status != domainmodel.QuizStatusOpen {
			continue
		}
		for _, submission := range f.submissions {
			if submission.QuizID == item.ID && submission.StudentID == studentID {
				item.Submitted = true
				item.Score = submission.Score
				item.Answers = append([]int(nil), submission.Answers...)
			}
		}
		item.Questions = cloneQuestions(item.Questions)
		items = append(items, item)
	}
	return items, nil
}

func cloneQuestions(questions []domainmodel.QuizQuestion) []domainmodel.QuizQuestion {
	cloned := make([]domainmodel.QuizQuestion, len(questions))
	for index, question := range questions {
		cloned[index] = question
		cloned[index].Options = append([]string(nil), question.Options...)
	}
	return cloned
}

func (f *fakeClassroomRepository) CreateQuizSubmission(_ context.Context, input domainmodel.QuizSubmission) error {
	for _, submission := range f.submissions {
		if submission.QuizID == input.QuizID && submission.StudentID == input.StudentID {
			return repository.ErrConflict
		}
	}
	input.ID = uint(len(f.submissions) + 1)
	f.submissions = append(f.submissions, input)
	return nil
}

func (f *fakeClassroomRepository) ListQuizSubmissions(_ context.Context, quizID uint) ([]domainmodel.QuizSubmission, error) {
	items := make([]domainmodel.QuizSubmission, 0)
	for _, item := range f.submissions {
		if item.QuizID == quizID {
			items = append(items, item)
		}
	}
	return items, nil
}

func newClassroomTestService() (*Service, *fakeClassroomRepository) {
	users := fakeUserReader{users: map[uint]*domainuser.User{
		1: {ID: 1, Role: domainuser.RoleTeacher, Username: "teacher_one"},
		2: {ID: 2, Role: domainuser.RoleTeacher, Username: "teacher_two"},
		3: {ID: 3, Role: domainuser.RoleAdmin, Username: "administrator"},
		4: {ID: 4, Role: domainuser.RoleStudent, Username: "student_one"},
		5: {ID: 5, Role: domainuser.RoleUser, Username: "regular_user"},
		6: {ID: 6, Role: domainuser.RoleStudent, Username: "student_two"},
	}}
	repo := &fakeClassroomRepository{
		classrooms: []domainmodel.Classroom{
			{ID: 10, PublicID: "class_one", TeacherID: 1, Name: "One"},
			{ID: 20, PublicID: "class_two", TeacherID: 2, Name: "Two"},
		},
		students:    map[uint][]domainmodel.Student{},
		memberships: map[uint]uint{4: 10, 6: 10},
	}
	return NewService(repo, users), repo
}

func TestListClassroomsRespectsRoleAndOwnership(t *testing.T) {
	service, repo := newClassroomTestService()
	ctx := context.Background()

	items, err := service.List(ctx, 1)
	if err != nil || len(items) != 1 || items[0].PublicID != "class_one" {
		t.Fatalf("teacher List() = %#v, %v, want teacher's classroom", items, err)
	}
	if repo.listActor != 1 || !repo.listOwnedOnly {
		t.Fatalf("teacher ListClassrooms actor/owned = %d/%t, want 1/true", repo.listActor, repo.listOwnedOnly)
	}

	items, err = service.List(ctx, 3)
	if err != nil || len(items) != 2 {
		t.Fatalf("admin List() = %#v, %v, want both classrooms", items, err)
	}
	if repo.listActor != 3 || repo.listOwnedOnly {
		t.Fatalf("admin ListClassrooms actor/owned = %d/%t, want 3/false", repo.listActor, repo.listOwnedOnly)
	}

	items, err = service.List(ctx, 4)
	if err != nil || len(items) != 0 {
		t.Fatalf("student List() = %#v, %v, want empty list", items, err)
	}
	if err = service.Update(ctx, 2, "class_one", "Changed", ""); !errors.Is(err, ErrNotFound) {
		t.Fatalf("cross-teacher Update() error = %v, want ErrNotFound", err)
	}
}

func TestCreateRequiresTeacherAndTrimsDetails(t *testing.T) {
	service, _ := newClassroomTestService()
	ctx := context.Background()

	if _, err := service.Create(ctx, 3, "Admin class", ""); !errors.Is(err, ErrForbidden) {
		t.Fatalf("admin Create() error = %v, want ErrForbidden", err)
	}
	if _, err := service.Create(ctx, 4, "Student class", ""); !errors.Is(err, ErrForbidden) {
		t.Fatalf("student Create() error = %v, want ErrForbidden", err)
	}
	item, err := service.Create(ctx, 1, "  Algebra 1  ", "  Monday cohort  ")
	if err != nil {
		t.Fatalf("teacher Create() error = %v", err)
	}
	if item.Name != "Algebra 1" || item.Description != "Monday cohort" || item.TeacherID != 1 || item.PublicID == "" {
		t.Fatalf("created classroom = %#v, want normalized teacher-owned classroom", item)
	}
}

func TestAdminCanReadButCannotManage(t *testing.T) {
	service, repo := newClassroomTestService()
	repo.students[10] = []domainmodel.Student{{PublicID: "student_public", Username: "student_one"}}
	ctx := context.Background()

	students, err := service.Students(ctx, 3, "class_one")
	if err != nil || len(students) != 1 {
		t.Fatalf("admin Students() = %#v, %v, want roster", students, err)
	}
	if err = service.Update(ctx, 3, "class_one", "Changed", ""); !errors.Is(err, ErrForbidden) {
		t.Fatalf("admin Update() error = %v, want ErrForbidden", err)
	}
	if err = service.Delete(ctx, 3, "class_one"); !errors.Is(err, ErrForbidden) {
		t.Fatalf("admin Delete() error = %v, want ErrForbidden", err)
	}
	if err = service.AddStudent(ctx, 3, "class_one", "student_one"); !errors.Is(err, ErrForbidden) {
		t.Fatalf("admin AddStudent() error = %v, want ErrForbidden", err)
	}
}

func TestAddStudentNormalizesAndAppliesAccountPolicy(t *testing.T) {
	service, repo := newClassroomTestService()
	ctx := context.Background()

	if err := service.AddStudent(ctx, 1, "class_one", "  S20260001  "); err != nil {
		t.Fatalf("AddStudent(valid) error = %v", err)
	}
	if len(repo.addCalls) != 1 || repo.addCalls[0].username != "s20260001" {
		t.Fatalf("AddClassroomStudent calls = %#v, want normalized username", repo.addCalls)
	}

	for _, raw := range []string{"", "   ", "ab", "abcdefghijklmnopq", "admin", "student@example.com", "-student", "student_"} {
		before := len(repo.addCalls)
		if err := service.AddStudent(ctx, 1, "class_one", raw); !errors.Is(err, ErrStudentNotFound) {
			t.Fatalf("AddStudent(%q) error = %v, want ErrStudentNotFound", raw, err)
		}
		if len(repo.addCalls) != before {
			t.Fatalf("AddStudent(%q) reached repository", raw)
		}
	}

	repo.addErr = repository.ErrConflict
	if err := service.AddStudent(ctx, 1, "class_one", "student_two"); !errors.Is(err, ErrAssigned) {
		t.Fatalf("AddStudent(duplicate) error = %v, want ErrAssigned", err)
	}
}

func TestCreateQuizValidatesAndNormalizesQuestions(t *testing.T) {
	service, _ := newClassroomTestService()
	ctx := context.Background()
	questions := []domainmodel.QuizQuestion{
		{Prompt: "  What is 1+1?  ", Options: []string{" 1 ", " 2 "}, Answer: 1},
		{Prompt: "Pick the stable pole", Options: []string{"-1", "1", "0"}, Answer: 0},
	}

	item, err := service.CreateQuiz(ctx, 1, "class_one", "  Pre-class quiz  ", domainmodel.QuizPhasePreClass, questions)
	if err != nil {
		t.Fatalf("CreateQuiz() error = %v", err)
	}
	if item.Status != domainmodel.QuizStatusDraft || item.TeacherID != 1 || item.ClassroomID != 10 {
		t.Fatalf("quiz identity = %#v", item)
	}
	if item.Title != "Pre-class quiz" || len(item.Questions) != 2 {
		t.Fatalf("quiz = %#v", item)
	}
	if item.Questions[0].ID != "q1" || item.Questions[0].Prompt != "What is 1+1?" || item.Questions[0].Options[0] != "1" {
		t.Fatalf("normalized question = %#v", item.Questions[0])
	}

	if _, err := service.CreateQuiz(ctx, 4, "class_one", "Quiz", domainmodel.QuizPhasePreClass, questions); !errors.Is(err, ErrForbidden) {
		t.Fatalf("student CreateQuiz() error = %v, want ErrForbidden", err)
	}
	for name, input := range map[string]struct {
		title     string
		phase     string
		questions []domainmodel.QuizQuestion
	}{
		"empty title":  {title: "  ", phase: domainmodel.QuizPhasePreClass, questions: questions},
		"bad phase":    {title: "Quiz", phase: "after_class", questions: questions},
		"no questions": {title: "Quiz", phase: domainmodel.QuizPhasePreClass},
		"bad answer":   {title: "Quiz", phase: domainmodel.QuizPhasePreClass, questions: []domainmodel.QuizQuestion{{Prompt: "Q", Options: []string{"A", "B"}, Answer: 2}}},
		"one option":   {title: "Quiz", phase: domainmodel.QuizPhasePreClass, questions: []domainmodel.QuizQuestion{{Prompt: "Q", Options: []string{"A"}, Answer: 0}}},
		"blank option": {title: "Quiz", phase: domainmodel.QuizPhasePreClass, questions: []domainmodel.QuizQuestion{{Prompt: "Q", Options: []string{"A", "  "}, Answer: 0}}},
	} {
		if _, err := service.CreateQuiz(ctx, 1, "class_one", input.title, input.phase, input.questions); !errors.Is(err, ErrQuizInvalid) {
			t.Fatalf("%s CreateQuiz() error = %v, want ErrQuizInvalid", name, err)
		}
	}
}

func TestStudentQuizFlowHidesAnswersAndEnforcesOnce(t *testing.T) {
	service, repo := newClassroomTestService()
	repo.students[10] = []domainmodel.Student{
		{PublicID: "student_4", Username: "student_one", DisplayName: "Student One"},
		{PublicID: "student_6", Username: "student_two", DisplayName: "Student Two"},
	}
	ctx := context.Background()
	quiz, err := service.CreateQuiz(ctx, 1, "class_one", "Warm-up", domainmodel.QuizPhasePreClass, []domainmodel.QuizQuestion{
		{Prompt: "Q1", Options: []string{"A", "B"}, Answer: 1},
		{Prompt: "Q2", Options: []string{"A", "B"}, Answer: 0},
	})
	if err != nil {
		t.Fatalf("CreateQuiz() error = %v", err)
	}
	if err := service.OpenQuiz(ctx, 1, quiz.PublicID); err != nil {
		t.Fatalf("OpenQuiz() error = %v", err)
	}

	classroom, items, err := service.StudentQuizzes(ctx, 4)
	if err != nil || classroom.ID != 10 || len(items) != 1 {
		t.Fatalf("StudentQuizzes() = %#v, %#v, %v", classroom, items, err)
	}
	if items[0].Questions[0].Answer != -1 || items[0].Questions[1].Answer != -1 {
		t.Fatalf("student quiz leaked answers: %#v", items[0].Questions)
	}

	result, err := service.SubmitQuiz(ctx, 4, quiz.PublicID, []int{1, 1})
	if err != nil || result.Score != 1 || result.Total != 2 || !result.Submitted {
		t.Fatalf("SubmitQuiz() = %#v, %v", result, err)
	}
	repo.submissions[len(repo.submissions)-1].StudentPublicID = "student_4"
	repo.submissions[len(repo.submissions)-1].StudentName = "Student One"
	repo.submissions[len(repo.submissions)-1].Username = "student_one"

	if _, err := service.SubmitQuiz(ctx, 4, quiz.PublicID, []int{1, 0}); !errors.Is(err, ErrQuizSubmitted) {
		t.Fatalf("duplicate SubmitQuiz() error = %v, want ErrQuizSubmitted", err)
	}
	if _, err := service.SubmitQuiz(ctx, 6, quiz.PublicID, []int{0}); !errors.Is(err, ErrQuizInvalid) {
		t.Fatalf("short SubmitQuiz() error = %v, want ErrQuizInvalid", err)
	}
	if _, err := service.SubmitQuiz(ctx, 6, quiz.PublicID, []int{2, 0}); !errors.Is(err, ErrQuizInvalid) {
		t.Fatalf("out-of-range SubmitQuiz() error = %v, want ErrQuizInvalid", err)
	}

	report, err := service.QuizReport(ctx, 1, quiz.PublicID)
	if err != nil {
		t.Fatalf("QuizReport() error = %v", err)
	}
	if report.SubmissionCount != 1 || report.StudentCount != 2 || len(report.Missing) != 1 || report.Missing[0].PublicID != "student_6" {
		t.Fatalf("report = %#v", report)
	}
	if len(report.Questions) != 2 || report.Questions[0].OptionCounts[1] != 1 || report.Questions[0].CorrectCount != 1 {
		t.Fatalf("question statistics = %#v", report.Questions)
	}

	if err := service.CloseQuiz(ctx, 1, quiz.PublicID); err != nil {
		t.Fatalf("CloseQuiz() error = %v", err)
	}
	if _, err := service.SubmitQuiz(ctx, 6, quiz.PublicID, []int{1, 0}); !errors.Is(err, ErrQuizClosed) {
		t.Fatalf("closed SubmitQuiz() error = %v, want ErrQuizClosed", err)
	}
	if _, _, err := service.StudentQuizzes(ctx, 5); !errors.Is(err, ErrForbidden) {
		t.Fatalf("non-student StudentQuizzes() error = %v, want ErrForbidden", err)
	}
}

func TestStudentQuizRequiresMembership(t *testing.T) {
	service, repo := newClassroomTestService()
	ctx := context.Background()
	delete(repo.memberships, 6)
	if _, _, err := service.StudentQuizzes(ctx, 6); !errors.Is(err, ErrNotInClassroom) {
		t.Fatalf("StudentQuizzes() error = %v, want ErrNotInClassroom", err)
	}
	if _, err := service.SubmitQuiz(ctx, 6, "missing", []int{0}); !errors.Is(err, ErrNotInClassroom) {
		t.Fatalf("SubmitQuiz() error = %v, want ErrNotInClassroom", err)
	}
}
