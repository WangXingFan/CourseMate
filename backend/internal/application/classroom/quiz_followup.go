package classroom

import (
	"context"
	"errors"
	"sort"
	"strings"
	"unicode/utf8"

	domain "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/classroom"
	domainlearning "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/learning"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/repository"
	"github.com/google/uuid"
)

func pairedSnapshot(lessonID string, question *domainlearning.CourseQuestion) domain.QuizQuestion {
	q := domain.QuizQuestion{ID: question.ID, LessonID: lessonID, Prompt: question.Prompt, Options: append([]string(nil), question.Options...), Answer: question.Answer, Explanation: question.Explanation}
	if pair := domainlearning.FindCourseQuestionPair(lessonID); pair != nil && pair.PreviewQuestionID == question.ID {
		q.ConceptID, q.ConceptTitle = pair.ConceptID, pair.ConceptTitle
		followup := pair.Followup
		q.Followup = &domain.QuizQuestion{ID: followup.ID, LessonID: lessonID, ConceptID: pair.ConceptID, ConceptTitle: pair.ConceptTitle, Prompt: followup.Prompt, Options: append([]string(nil), followup.Options...), Answer: followup.Answer, Explanation: followup.Explanation}
	}
	return q
}

func (s *Service) findFollowup(ctx context.Context, source domain.Quiz) (*domain.Quiz, error) {
	items, err := s.repo.ListQuizzes(ctx, source.ClassroomID)
	if err != nil {
		return nil, err
	}
	for i := range items {
		if items[i].SourceQuizID == source.PublicID {
			return &items[i], nil
		}
	}
	return nil, nil
}

// CreateQuizFollowup creates at most one immutable same-concept retest per
// preview quiz. Repeated requests return the same draft/published quiz.
func (s *Service) CreateQuizFollowup(ctx context.Context, actor uint, sourceID string) (*domain.Quiz, error) {
	source, err := s.ownedQuiz(ctx, actor, sourceID)
	if err != nil {
		return nil, err
	}
	if source.Phase != domain.QuizPhasePreClass || source.SourceQuizID != "" {
		return nil, ErrQuizInvalid
	}
	existing, err := s.findFollowup(ctx, *source)
	if err != nil || existing != nil {
		return existing, err
	}
	if source.Status != domain.QuizStatusClosed {
		return nil, ErrQuizInvalid
	}
	questions := make([]domain.QuizQuestion, 0, len(source.Questions))
	for _, before := range source.Questions {
		followup := before.Followup
		// Compatibility for saved previews predating paired snapshots.
		if followup == nil {
			pair := domainlearning.FindPreviewQuestionPair(before.ID)
			if pair == nil {
				return nil, ErrQuizInvalid
			}
			snapshot := pairedSnapshot(pair.LessonID, previewQuestion(domainlearning.FindCourseLesson(pair.LessonID)))
			followup = snapshot.Followup
		}
		if followup == nil || followup.ConceptID == "" || len(followup.Options) != 4 {
			return nil, ErrQuizInvalid
		}
		q := *followup
		q.Followup = nil
		questions = append(questions, q)
	}
	title := source.Title
	if utf8.RuneCountInString(title) > quizTitleMaxLength-5 {
		title = string([]rune(title)[:quizTitleMaxLength-5])
	}
	id := strings.ReplaceAll(uuid.NewSHA1(uuid.NameSpaceOID, []byte(source.PublicID+":concept-followup-v1")).String(), "-", "")
	item, err := s.repo.CreateQuiz(ctx, domain.Quiz{PublicID: id, SourceQuizID: source.PublicID, ClassroomID: source.ClassroomID, TeacherID: actor, Title: title + " · 复测", Phase: domain.QuizPhaseInClass, Status: domain.QuizStatusDraft, Questions: questions})
	if errors.Is(err, repository.ErrConflict) || errors.Is(err, repository.ErrDuplicate) {
		return s.ownedQuiz(ctx, actor, id)
	}
	if errors.Is(err, repository.ErrInvalidInput) {
		return nil, ErrQuizInvalid
	}
	return item, err
}

// QuizComparison only uses students who submitted both forms for correctness
// rates. Missing and unmatched students are counted separately, not as wrong.
type QuizComparison struct {
	BeforeID, BeforeTitle, AfterID, AfterTitle, AfterStatus string
	PairedCount, BeforeOnly, AfterOnly, Neither             int
	Questions                                               []QuizConceptComparison
	Students                                                []QuizStudentComparison
}

type QuizConceptComparison struct {
	ConceptID, ConceptTitle                   string
	PairedCount, BeforeCorrect, AfterCorrect  int
	Improved, Retained, Regressed, Unresolved int
}

type QuizStudentComparison struct {
	StudentID, StudentName, Username string
	BeforeSubmitted, AfterSubmitted  bool
	BeforeScore, AfterScore          int
	Changes                          []QuizConceptChange
}

type QuizConceptChange struct {
	ConceptID string
	Outcome   string
}

func questionConcept(q domain.QuizQuestion) string {
	if q.ConceptID != "" {
		return q.ConceptID
	}
	if pair := domainlearning.FindPreviewQuestionPair(q.ID); pair != nil {
		return pair.ConceptID
	}
	return ""
}

func validChoice(sub domain.QuizSubmission, index int, q domain.QuizQuestion) bool {
	return index < len(sub.Answers) && sub.Answers[index] >= 0 && sub.Answers[index] < len(q.Options)
}

func buildComparison(before, after domain.Quiz, roster []domain.Student, pre, post []domain.QuizSubmission) *QuizComparison {
	result := &QuizComparison{BeforeID: before.PublicID, BeforeTitle: before.Title, AfterID: after.PublicID, AfterTitle: after.Title, AfterStatus: after.Status, Questions: []QuizConceptComparison{}, Students: []QuizStudentComparison{}}
	people := map[string]domain.Student{}
	preByID, postByID := map[string]domain.QuizSubmission{}, map[string]domain.QuizSubmission{}
	for _, student := range roster {
		people[student.PublicID] = student
	}
	for index, submissions := range [][]domain.QuizSubmission{pre, post} {
		for _, sub := range submissions {
			id := sub.StudentPublicID
			if id == "" {
				continue
			}
			if _, ok := people[id]; !ok {
				people[id] = domain.Student{PublicID: id, Username: sub.Username, DisplayName: sub.StudentName}
			}
			if index == 0 {
				preByID[id] = sub
			} else {
				postByID[id] = sub
			}
		}
	}
	postIndices := map[string]int{}
	for i, q := range after.Questions {
		if id := questionConcept(q); id != "" {
			postIndices[id] = i
		}
	}
	type questionPair struct{ before, after int }
	pairs := []questionPair{}
	for i, q := range before.Questions {
		id := questionConcept(q)
		j, ok := postIndices[id]
		if id == "" || !ok {
			continue
		}
		title := q.ConceptTitle
		if title == "" {
			title = after.Questions[j].ConceptTitle
		}
		pairs = append(pairs, questionPair{i, j})
		result.Questions = append(result.Questions, QuizConceptComparison{ConceptID: id, ConceptTitle: title})
	}
	for id, student := range people {
		a, hasPre := preByID[id]
		b, hasPost := postByID[id]
		row := QuizStudentComparison{StudentID: id, StudentName: student.DisplayName, Username: student.Username, BeforeSubmitted: hasPre, AfterSubmitted: hasPost, Changes: []QuizConceptChange{}}
		switch {
		case hasPre && hasPost:
			result.PairedCount++
		case hasPre:
			result.BeforeOnly++
		case hasPost:
			result.AfterOnly++
		default:
			result.Neither++
		}
		for k, pair := range pairs {
			preQ, postQ := before.Questions[pair.before], after.Questions[pair.after]
			validPre, validPost := hasPre && validChoice(a, pair.before, preQ), hasPost && validChoice(b, pair.after, postQ)
			outcome := "neither"
			switch {
			case validPre && validPost:
				stat := &result.Questions[k]
				stat.PairedCount++
				correctPre, correctPost := a.Answers[pair.before] == preQ.Answer, b.Answers[pair.after] == postQ.Answer
				if correctPre {
					stat.BeforeCorrect++
					row.BeforeScore++
				}
				if correctPost {
					stat.AfterCorrect++
					row.AfterScore++
				}
				switch {
				case !correctPre && correctPost:
					outcome = "improved"
					stat.Improved++
				case correctPre && correctPost:
					outcome = "retained"
					stat.Retained++
				case correctPre && !correctPost:
					outcome = "regressed"
					stat.Regressed++
				default:
					outcome = "unresolved"
					stat.Unresolved++
				}
			case validPre:
				outcome = "before_only"
			case validPost:
				outcome = "after_only"
			}
			row.Changes = append(row.Changes, QuizConceptChange{ConceptID: result.Questions[k].ConceptID, Outcome: outcome})
		}
		result.Students = append(result.Students, row)
	}
	sort.Slice(result.Students, func(i, j int) bool {
		a, b := result.Students[i], result.Students[j]
		if a.Username == b.Username {
			return a.StudentID < b.StudentID
		}
		return a.Username < b.Username
	})
	return result
}

func (s *Service) quizComparison(ctx context.Context, actor uint, quiz domain.Quiz, roster []domain.Student) (*QuizComparison, error) {
	before, after := &quiz, (*domain.Quiz)(nil)
	var err error
	if quiz.SourceQuizID != "" {
		after = &quiz
		before, err = s.ownedQuiz(ctx, actor, quiz.SourceQuizID)
	} else if quiz.Phase == domain.QuizPhasePreClass {
		after, err = s.findFollowup(ctx, quiz)
	}
	if err != nil || after == nil {
		return nil, err
	}
	if before.ClassroomID != after.ClassroomID || before.TeacherID != after.TeacherID {
		return nil, ErrQuizInvalid
	}
	pre, err := s.repo.ListQuizSubmissions(ctx, before.ID)
	if err != nil {
		return nil, err
	}
	post, err := s.repo.ListQuizSubmissions(ctx, after.ID)
	if err != nil {
		return nil, err
	}
	return buildComparison(*before, *after, roster, pre, post), nil
}
