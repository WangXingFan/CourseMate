package classroom

import (
	"context"
	"testing"
)

func TestNumericActivityPartialCreditAndWholeQuestionAccuracy(t *testing.T) {
	service, _ := newClassroomTestService()
	ctx := context.Background()
	quiz, err := service.CreateQuiz(ctx, 1, "class_one", "区间计算", []string{"ss-1-2"}, "in_class")
	if err != nil {
		t.Fatal(err)
	}
	if err = service.OpenQuiz(ctx, 1, quiz.PublicID); err != nil {
		t.Fatal(err)
	}
	result, err := service.SubmitQuiz(ctx, 4, quiz.PublicID, []int{-1}, map[string]map[string]string{quiz.Questions[0].ID: {"f1": "2/2", "f2": "3"}})
	if err != nil || result.Score != 1 || result.Total != 2 {
		t.Fatalf("partial credit: %+v %v", result, err)
	}
	report, err := service.QuizReport(ctx, 1, quiz.PublicID)
	if err != nil || report.AverageScore != 1 || report.Questions[0].CorrectCount != 0 {
		t.Fatalf("whole-question accuracy: %+v %v", report, err)
	}
}
