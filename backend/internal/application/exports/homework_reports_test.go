package exports

import (
	"bytes"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	class "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/classroom"
	"github.com/coregx/gxpdf"
)

func homeworkPDFTextForTest(t *testing.T, data []byte) string {
	t.Helper()
	path := filepath.Join(t.TempDir(), "paper.pdf")
	if err := os.WriteFile(path, data, 0600); err != nil {
		t.Fatal(err)
	}
	doc, err := gxpdf.Open(path)
	if err != nil {
		t.Fatal(err)
	}
	defer doc.Close()
	var result strings.Builder
	for page := 1; page <= doc.PageCount(); page++ {
		text, err := doc.ExtractTextFromPage(page)
		if err != nil {
			t.Fatal(err)
		}
		result.WriteString(text)
	}
	return strings.ReplaceAll(result.String(), " ", "")
}

func TestHomeworkPapersPreserveAnswersScoresAndDiagrams(t *testing.T) {
	now := time.Date(2026, 11, 8, 10, 0, 0, 0, time.UTC)
	d := dataset{class: class.Classroom{Name: "信号班"}, now: now}
	st := class.Student{ID: 1, Username: "001234", DisplayName: "张同学"}
	for _, paper := range class.HomeworkBank() {
		t.Run(paper.ID, func(t *testing.T) {
			h := homeworkData{item: class.Homework{PublicID: paper.ID, Title: paper.Title, Questions: paper.Questions, StartsAt: now.Add(-2 * time.Hour), Deadline: now.Add(-time.Hour)}, submissions: map[uint]class.HomeworkSubmission{}}
			answers := make([][]string, len(paper.Questions))
			for i, question := range paper.Questions {
				answers[i] = make([]string, len(question.Accepted))
				for blank, accepted := range question.Accepted {
					answers[i][blank] = accepted[0]
				}
			}
			results, score, ok := class.GradeHomework(paper.Questions, answers)
			if !ok || score != 100 {
				t.Fatal("invalid test paper")
			}
			h.submissions[st.ID] = class.HomeworkSubmission{Answers: answers, Results: results, Score: 95, SubmittedAt: now.Add(-90 * time.Minute), Corrections: []class.HomeworkCorrection{{Before: 100, Score: 95, Reason: "复核更正", At: now}}}
			data, err := renderHomeworkReport(d, st, h)
			if err != nil {
				t.Fatal(err)
			}
			if paper.ID != "homework-1" && !bytes.Contains(data, []byte("/Subtype /Image")) {
				t.Fatal("diagrams missing from PDF")
			}
			text := homeworkPDFTextForTest(t, data)
			for _, expected := range []string{"001234", "张同学", "正式总分：95/100", "原始自动评分：100/100", "复核更正", "第10题", "学生作答：", "本题自动评分：10/10"} {
				if !strings.Contains(text, expected) {
					t.Fatalf("missing %q in PDF: %s", expected, text)
				}
			}
			if strings.Contains(text, "/learning/homework/") || strings.Contains(text, `\frac`) {
				t.Fatal("question markup leaked into the PDF")
			}
		})
	}
	if got := homeworkPDFText(`$\frac{e^{-\left(s+2\right)}}{s+2}$`); got != "(e^(-(s+2)))/(s+2)" {
		t.Fatalf("nested fraction changed meaning: %s", got)
	}
}

func TestHomeworkPDFSubmissionStatesAndRawAnswers(t *testing.T) {
	now := time.Now()
	d := dataset{class: class.Classroom{Name: "信号班"}, now: now}
	st := class.Student{ID: 1, Username: "001", DisplayName: "张同学", JoinedAt: now.Add(-time.Hour)}
	h := homeworkData{item: class.Homework{Title: "作业", Deadline: now.Add(-2 * time.Hour), Questions: []class.HomeworkQuestion{{ID: "q", Kind: "blank", Points: 10, Prompt: "填空", Accepted: [][]string{{"2"}, {"3"}}}}}, submissions: map[uint]class.HomeworkSubmission{}}
	check := func(expected string) {
		t.Helper()
		data, err := renderHomeworkReport(d, st, h)
		if err != nil {
			t.Fatal(err)
		}
		if text := homeworkPDFTextForTest(t, data); !strings.Contains(text, expected) {
			t.Fatalf("missing %q: %s", expected, text)
		}
	}
	check("入班前已截止")
	st.JoinedAt = now.Add(-3 * time.Hour)
	check("正式成绩计0分")
	h.item.Deadline = now.Add(time.Hour)
	check("未提交（作业进行中）")
	h.submissions[1] = class.HomeworkSubmission{Answers: [][]string{{"{a} + b", ""}}, Results: []class.HomeworkResult{{QuestionID: "q", Total: 10, Correct: []bool{false, false}}}, SubmittedAt: now}
	check("第1空作答：{a}+b（错误）")
	check("第2空作答：未作答（错误）")
}
