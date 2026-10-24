package classroom

import (
	"context"
	"errors"
	"testing"

	domain "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/classroom"
)

func TestFollowupSnapshotLifecycleOwnershipAndIdempotency(t *testing.T) {
	s, repo := newClassroomTestService()
	ctx := context.Background()
	preview, err := s.CreateQuiz(ctx, 1, "class_one", "一个知识点", []string{"ss-1-1"})
	if err != nil {
		t.Fatal(err)
	}
	if preview.Questions[0].ConceptID == "" || preview.Questions[0].Followup == nil {
		t.Fatal("missing paired snapshot")
	}
	if _, err = s.CreateQuizFollowup(ctx, 1, preview.PublicID); !errors.Is(err, ErrQuizInvalid) {
		t.Fatalf("draft preview accepted: %v", err)
	}
	if err = s.OpenQuiz(ctx, 1, preview.PublicID); err != nil {
		t.Fatal(err)
	}
	_, studentQuizzes, err := s.StudentQuizzes(ctx, 4)
	if err != nil || len(studentQuizzes) != 1 {
		t.Fatalf("student view: %v", err)
	}
	for _, q := range studentQuizzes[0].Questions {
		if q.Answer != -1 || q.Explanation != "" || q.Followup != nil {
			t.Fatal("student view leaked grading or future question")
		}
	}
	if _, err = s.CreateQuizFollowup(ctx, 1, preview.PublicID); !errors.Is(err, ErrQuizInvalid) {
		t.Fatalf("open preview accepted: %v", err)
	}
	if err = s.CloseQuiz(ctx, 1, preview.PublicID); err != nil {
		t.Fatal(err)
	}
	if _, err = s.CreateQuizFollowup(ctx, 2, preview.PublicID); !errors.Is(err, ErrQuizNotFound) {
		t.Fatalf("other teacher accepted: %v", err)
	}
	if _, err = s.CreateQuizFollowup(ctx, 4, preview.PublicID); !errors.Is(err, ErrForbidden) {
		t.Fatalf("student accepted: %v", err)
	}
	// Use the stored variant even if authored content were to change later.
	stored := *repo.quizzes[0].Questions[0].Followup
	stored.Prompt = "保存的变式快照"
	repo.quizzes[0].Questions[0].Followup = &stored
	after, err := s.CreateQuizFollowup(ctx, 1, preview.PublicID)
	if err != nil {
		t.Fatal(err)
	}
	if after.SourceQuizID != preview.PublicID || after.Status != domain.QuizStatusDraft || after.Phase != domain.QuizPhaseInClass || after.Questions[0].Prompt != stored.Prompt || after.Questions[0].ConceptID != preview.Questions[0].ConceptID {
		t.Fatalf("followup mismatch: %+v", after)
	}
	retry, err := s.CreateQuizFollowup(ctx, 1, preview.PublicID)
	if err != nil || retry.PublicID != after.PublicID || len(repo.quizzes) != 2 {
		t.Fatalf("not idempotent: %v", err)
	}
	if err = s.OpenQuiz(ctx, 1, preview.PublicID); !errors.Is(err, ErrQuizInvalid) {
		t.Fatal("preview reopened after retest was linked")
	}
	if err = s.OpenQuiz(ctx, 1, after.PublicID); err != nil {
		t.Fatal(err)
	}
	if _, err = s.CreateQuizFollowup(ctx, 1, after.PublicID); !errors.Is(err, ErrQuizInvalid) {
		t.Fatal("allowed retest of retest")
	}
	beforeReport, err := s.QuizReport(ctx, 1, preview.PublicID)
	if err != nil || beforeReport.Comparison == nil || beforeReport.Comparison.AfterID != after.PublicID {
		t.Fatalf("preview report not linked: %v", err)
	}
	afterReport, err := s.QuizReport(ctx, 1, after.PublicID)
	if err != nil || afterReport.Comparison == nil || afterReport.Comparison.BeforeID != preview.PublicID {
		t.Fatalf("retest report not linked: %v", err)
	}
}

func TestComparisonMatchesStudentsAndConceptsNotPositions(t *testing.T) {
	q := func(id string, answer int) domain.QuizQuestion {
		return domain.QuizQuestion{ID: id, ConceptID: id, ConceptTitle: id, Options: []string{"a", "b", "c", "d"}, Answer: answer}
	}
	before := domain.Quiz{PublicID: "pre", Questions: []domain.QuizQuestion{q("A", 0), q("B", 1)}}
	after := domain.Quiz{PublicID: "post", Questions: []domain.QuizQuestion{q("B", 2), q("A", 3)}}
	roster := []domain.Student{{PublicID: "improved"}, {PublicID: "retained"}, {PublicID: "regressed"}, {PublicID: "unresolved"}, {PublicID: "before-only"}, {PublicID: "after-only"}, {PublicID: "neither"}}
	pre := []domain.QuizSubmission{
		{StudentPublicID: "improved", Answers: []int{1, 1}}, {StudentPublicID: "retained", Answers: []int{0, 1}},
		{StudentPublicID: "regressed", Answers: []int{0, 1}}, {StudentPublicID: "unresolved", Answers: []int{1, 1}},
		{StudentPublicID: "before-only", Answers: []int{0, 1}}, {StudentPublicID: "historical", StudentName: "已离班学生", Answers: []int{0, 1}},
	}
	post := []domain.QuizSubmission{
		{StudentPublicID: "unresolved", Answers: []int{2, 0}}, {StudentPublicID: "regressed", Answers: []int{2, 0}},
		{StudentPublicID: "retained", Answers: []int{2, 3}}, {StudentPublicID: "improved", Answers: []int{2, 3}},
		{StudentPublicID: "after-only", Answers: []int{2, 3}}, {StudentPublicID: "historical", Answers: []int{2, 3}},
	}
	result := buildComparison(before, after, roster, pre, post)
	if result.PairedCount != 5 || result.BeforeOnly != 1 || result.AfterOnly != 1 || result.Neither != 1 || len(result.Students) != 8 {
		t.Fatalf("cohort mismatch: %+v", result)
	}
	a, b := result.Questions[0], result.Questions[1]
	if a.BeforeCorrect != 3 || a.AfterCorrect != 3 || a.Improved != 1 || a.Retained != 2 || a.Regressed != 1 || a.Unresolved != 1 || a.PairedCount != 5 {
		t.Fatalf("concept A: %+v", a)
	}
	if b.BeforeCorrect != 5 || b.AfterCorrect != 5 || b.Retained != 5 {
		t.Fatalf("reordered concept B: %+v", b)
	}
}

func TestComparisonDoesNotTreatInvalidOrMissingAnswersAsWrong(t *testing.T) {
	q := domain.QuizQuestion{ConceptID: "a", Options: []string{"a", "b"}, Answer: 0}
	before, after := domain.Quiz{Questions: []domain.QuizQuestion{q}}, domain.Quiz{Questions: []domain.QuizQuestion{q}}
	result := buildComparison(before, after, nil, []domain.QuizSubmission{{StudentPublicID: "one", Answers: []int{0}}}, []domain.QuizSubmission{{StudentPublicID: "one", Answers: []int{99}}})
	if result.PairedCount != 1 || result.Questions[0].PairedCount != 0 || result.Questions[0].Regressed != 0 || result.Students[0].Changes[0].Outcome != "before_only" {
		t.Fatalf("invalid answer graded as wrong: %+v", result)
	}
}

func TestLegacyPreviewCanCreateMatchedFollowup(t *testing.T) {
	s, repo := newClassroomTestService()
	quiz, err := s.CreateQuiz(context.Background(), 1, "class_one", "旧预习", []string{"ss-2-1"})
	if err != nil {
		t.Fatal(err)
	}
	q := &repo.quizzes[0].Questions[0]
	q.Followup, q.ConceptID, q.ConceptTitle = nil, "", ""
	repo.quizzes[0].Status = domain.QuizStatusClosed
	post, err := s.CreateQuizFollowup(context.Background(), 1, quiz.PublicID)
	if err != nil || post.Questions[0].ConceptID == "" {
		t.Fatalf("legacy followup: %v", err)
	}
	if questionConcept(*q) != post.Questions[0].ConceptID {
		t.Fatal("legacy concept not matched")
	}
}
