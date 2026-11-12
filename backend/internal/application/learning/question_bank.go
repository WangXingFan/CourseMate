package learning

import (
	"fmt"
	"math"
	"slices"
	"strconv"
	"strings"

	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/classroom"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/labassessment"
	domain "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/learning"
	domainuser "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/user"
)

type BankCategory struct {
	ID    string
	Count int
}

type QuestionBankPage struct {
	Questions             []domain.BankQuestion
	Categories            []BankCategory
	Total, Page, PageSize int
}

var bankCategoryIDs = []string{"quick", "review", "preview", "in_class", "after_class", "preview_retest", "in_class_retest", "homework", "lab_concept", "lab_calculation", "lab_checkpoint"}

// Static authored content is assembled once. The existing graders remain the
// authority for answers, including all 64 parameter versions of each lab task.
var staffQuestionBanks = map[string][]domain.BankQuestion{
	"zh-CN": buildStaffQuestionBank("zh-CN"),
	"en-US": buildStaffQuestionBank("en-US"),
}

func CanReadQuestionBank(role string) bool {
	return role == domainuser.RoleTeacher || domainuser.IsAdminRole(role)
}

func (s *Service) QuestionBank(role, locale, category, query string, page, pageSize int) (*QuestionBankPage, error) {
	if !CanReadQuestionBank(role) {
		return nil, ErrQuestionBankForbidden
	}
	if page < 1 || pageSize < 1 || pageSize > 100 || len([]rune(query)) > 200 {
		return nil, ErrInvalid
	}
	if locale != "en-US" {
		locale = "zh-CN"
	}
	items := staffQuestionBanks[locale]
	result := &QuestionBankPage{Questions: []domain.BankQuestion{}, Categories: []BankCategory{}, Page: page, PageSize: pageSize}
	validCategory := category == ""
	counts := map[string]int{}
	for _, q := range items {
		counts[q.Category]++
	}
	for _, id := range bankCategoryIDs {
		result.Categories = append(result.Categories, BankCategory{ID: id, Count: counts[id]})
		if category == id {
			validCategory = true
		}
	}
	if !validCategory {
		return nil, ErrInvalid
	}
	terms := strings.Fields(strings.ToLower(query))
	for _, q := range items {
		if category != "" && q.Category != category {
			continue
		}
		if len(terms) > 0 {
			text := q.ID + " " + q.Title + " " + q.Prompt + " " + q.Formula + " " + q.Explanation
			for _, part := range q.Parts {
				text += " " + part.Label + " " + strings.Join(part.Options, " ") + " " + strings.Join(part.Answers, " ") + " " + part.Explanation
			}
			text = strings.ToLower(text)
			matches := true
			for _, term := range terms {
				if !strings.Contains(text, term) {
					matches = false
					break
				}
			}
			if !matches {
				continue
			}
		}
		// Division avoids offset overflow for a very large requested page.
		if result.Total/pageSize == page-1 {
			result.Questions = append(result.Questions, q)
		}
		result.Total++
	}
	return result, nil
}

func buildStaffQuestionBank(locale string) []domain.BankQuestion {
	result := domain.LearningBankQuestions(locale)
	for _, paper := range classroom.HomeworkBank() {
		for _, q := range paper.Questions {
			parts := []domain.BankPart{}
			for i, answers := range q.Accepted {
				part := domain.BankPart{Answers: answers}
				if q.Kind == "blank" {
					part.Label = fmt.Sprintf("第 %d 空", i+1)
				} else {
					answer, err := strconv.Atoi(answers[0])
					if err != nil {
						panic(err)
					}
					part = domain.ChoiceBankPart(q.Options, answer)
				}
				parts = append(parts, part)
			}
			result = append(result, domain.BankQuestion{ID: q.ID, Category: "homework", Title: paper.Title, Prompt: q.Prompt, Explanation: q.Explanation, Language: "zh-CN", Parts: parts})
		}
	}
	for _, course := range []string{"L1", "L2", "L3"} {
		for _, task := range labassessment.TaskIDs(course) {
			for i, pair := range labassessment.Concepts[task] {
				for j, concept := range pair {
					options := append([]string{concept.Correct}, concept.Others...)
					result = append(result, domain.BankQuestion{ID: fmt.Sprintf("%s-concept-%d-%d", task, i+1, j+1), Category: "lab_concept", Title: task + " " + labassessment.Titles[task], Prompt: concept.Prompt, Explanation: concept.Explanation, Language: "zh-CN", Parts: []domain.BankPart{domain.ChoiceBankPart(options, 0)}})
				}
			}
			for variant := 0; variant < 64; variant++ {
				paper, err := labassessment.PaperFor(task, variant)
				if err != nil {
					panic(err)
				}
				item := labBankQuestion(paper, "lab_calculation", fmt.Sprintf("%s-version-%02d", task, variant+1))
				item.Title += fmt.Sprintf(" · 参数版本 %d/64", variant+1)
				result = append(result, item)
			}
			for i, checkpoint := range labassessment.Checkpoints(task) {
				result = append(result, labBankQuestion(checkpoint.Paper, "lab_checkpoint", fmt.Sprintf("%s-checkpoint-%d", task, i+1)))
			}
		}
	}
	categoryOrder := map[string]int{}
	for i, id := range bankCategoryIDs {
		categoryOrder[id] = i
	}
	slices.SortStableFunc(result, func(a, b domain.BankQuestion) int { return categoryOrder[a.Category] - categoryOrder[b.Category] })
	return result
}

func labBankQuestion(paper labassessment.Paper, category, id string) domain.BankQuestion {
	item := domain.BankQuestion{ID: id, Category: category, Title: paper.TaskID + " " + paper.Title, Prompt: paper.Prompt, Formula: paper.Formula, Explanation: paper.Explanation, Language: "zh-CN", Parts: []domain.BankPart{}}
	if paper.TaskID == "L1-4" {
		for _, field := range paper.Fields {
			if field.ID == "ecgPlan" {
				item.Prompt += " 图形观测：同一洁净心电R峰约1.00；方案A平均后峰高约0.87，方案B约0.28且更宽；两者均抵消理想50 Hz正弦。"
			}
			if field.ID == "ecgNoise" {
				item.Prompt += " 图形观测：10 ms输出仍有波纹；20 ms输出接近零线。"
			}
			if field.ID == "ecgTiming" {
				item.Prompt += " 图形观测：输出时刻400 ms时，20 ms窗取样[380,400]、中心390 ms；80 ms窗取样[320,400]、中心360 ms。输出时刻移动到440 ms后，两窗中心分别为430、400 ms。"
			}
		}
	}
	if paper.TaskID == "L1-3" && len(paper.Reference) > 0 {
		// The question bank is text-only. Supply representative chart readings
		// so these questions remain answerable outside the interactive workbench.
		item.Prompt += " 曲线读数（t/s：调整前，调整后）："
		for _, index := range []int{0, 20, 60, 160} {
			point := paper.Reference[index]
			item.Prompt += fmt.Sprintf("%.0f：%.4f，%.4f；", point.X, 1+math.Exp(-point.X), point.Y)
		}
	}
	for _, field := range paper.Fields {
		// The 48 authored concept questions have their own category.
		if field.ID == "C1" || field.ID == "C2" {
			continue
		}
		part := domain.BankPart{Label: field.Label, Explanation: field.Explanation, Answers: []string{}}
		if paper.Explanation != "" {
			part.Explanation = ""
		}
		if field.Kind == "choice" {
			for i, option := range field.Options {
				part.Options = append(part.Options, option.Label)
				if option.ID == field.Answer {
					part.Answers = append(part.Answers, string(rune('A'+i)))
				}
			}
		} else {
			answer := strconv.FormatFloat(field.Expected, 'g', 8, 64)
			if field.Unit != "" {
				answer += " " + field.Unit
			}
			if field.Kind == "alpha" || field.Kind == "ratio" {
				answer = "参考方案（f₀=" + strconv.FormatFloat(paper.Parameters["noise"], 'g', -1, 64) + " Hz，α=10 s⁻¹）：" + answer
				part.Explanation += " 此题允许满足指标的其他参数方案；幅度比须按所选参数重新计算。"
			}
			part.Answers = []string{answer}
		}
		item.Parts = append(item.Parts, part)
	}
	return item
}
