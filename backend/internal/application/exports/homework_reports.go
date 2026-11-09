package exports

import (
	"archive/zip"
	"bytes"
	"context"
	"errors"
	"fmt"
	"sort"
	"strconv"
	"strings"

	class "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/classroom"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/repository"
	"github.com/go-pdf/fpdf"
)

func (s *Service) collectHomeworkReport(ctx context.Context, d *dataset, id string) error {
	item, err := s.classes.GetHomework(ctx, id)
	if errors.Is(err, repository.ErrNotFound) {
		return ErrNotFound
	}
	if err != nil {
		return err
	}
	if item.ClassroomID != d.class.ID {
		return ErrNotFound
	}
	if item.Withdrawn || item.StartsAt.After(d.now) {
		return ErrInvalid
	}
	subs, err := s.classes.ListHomeworkSubmissions(ctx, item.ID, 0)
	if err != nil {
		return err
	}
	row := homeworkData{item: *item, submissions: map[uint]class.HomeworkSubmission{}}
	students := map[uint]bool{}
	for _, st := range d.students {
		students[st.ID] = true
	}
	for _, sub := range subs {
		row.submissions[sub.StudentID] = sub
		// Preserve submitted papers even after a student leaves this classroom.
		if !students[sub.StudentID] {
			d.students = append(d.students, class.Student{ID: sub.StudentID, PublicID: sub.StudentPublicID, Username: sub.Username, DisplayName: sub.StudentName})
			students[sub.StudentID] = true
		}
	}
	sort.Slice(d.students, func(i, j int) bool { return d.students[i].Username < d.students[j].Username })
	d.homeworks = []homeworkData{row}
	return nil
}

func homeworkReports(ctx context.Context, d dataset, o Options) (*File, error) {
	homework := d.homeworks[0]
	if _, err := pdfReportName(o.FilenameTemplate, d, class.Student{}, "作业", homework.item.Title); err != nil {
		return nil, err
	}
	var buffer bytes.Buffer
	archive := zip.NewWriter(&buffer)
	names := map[string]bool{}
	for _, st := range d.students {
		if err := ctx.Err(); err != nil {
			return nil, err
		}
		pdf, err := renderHomeworkReport(d, st, homework)
		if err != nil {
			return nil, fmt.Errorf("homework %s student %d PDF: %w", homework.item.PublicID, st.ID, err)
		}
		base, _ := pdfReportName(o.FilenameTemplate, d, st, "作业", homework.item.Title)
		name := base + ".pdf"
		for i := 2; names[strings.ToLower(name)]; i++ {
			name = fmt.Sprintf("%s_%d.pdf", base, i)
		}
		names[strings.ToLower(name)] = true
		entry, err := archive.Create(name)
		if err != nil {
			return nil, err
		}
		if _, err = entry.Write(pdf); err != nil {
			return nil, err
		}
	}
	if err := archive.Close(); err != nil {
		return nil, err
	}
	name := d.class.Name + "_" + homework.item.Title + "_" + homework.item.StartsAt.In(beijing).Format("20060102-1504") + "_答卷"
	return &File{safeName(name) + ".zip", "application/zip", buffer.Bytes()}, nil
}

func renderHomeworkReport(d dataset, st class.Student, h homeworkData) ([]byte, error) {
	p := fpdf.New("P", "mm", "A4", "")
	p.SetMargins(18, 18, 18)
	p.SetAutoPageBreak(true, 18)
	p.AddUTF8FontFromBytes("noto", "", reportFont)
	p.SetTitle(h.item.Title+" · "+st.Username+" · "+st.DisplayName, true)
	p.SetFooterFunc(func() {
		p.SetY(-12)
		p.SetFont("noto", "", 9)
		p.CellFormat(0, 5, fmt.Sprintf("%s / %s     %d", st.Username, st.DisplayName, p.PageNo()), "", 0, "C", false, 0, "")
	})
	line := func(text string) {
		p.SetFont("noto", "", 10)
		p.MultiCell(0, 6, text, "", "L", false)
	}
	p.AddPage()
	p.SetFont("noto", "", 22)
	p.MultiCell(0, 12, h.item.Title+" · 学生答卷", "", "L", false)
	p.Ln(4)
	line("班级：" + d.class.Name)
	line("学号：" + st.Username + "    姓名：" + st.DisplayName)
	line("开始时间：" + date(h.item.StartsAt))
	line("截止时间：" + date(h.item.Deadline))
	line("导出时间：" + date(d.now) + "（以上均为北京时间）")
	line("作业编号：" + h.item.PublicID)
	sub, submitted := h.submissions[st.ID]
	switch {
	case submitted:
		original := 0
		for _, result := range sub.Results {
			original += result.Score
		}
		line("提交状态：已提交    提交时间：" + date(sub.SubmittedAt))
		line(fmt.Sprintf("正式总分：%d / %d    原始自动评分：%d / %d", sub.Score, h.item.Total(), original, h.item.Total()))
		for _, correction := range sub.Corrections {
			line(fmt.Sprintf("教师改分：%d → %d；%s；%s", correction.Before, correction.Score, correction.Reason, date(correction.At)))
		}
	case !h.item.AppliesTo(st.JoinedAt):
		line("提交状态：不适用（入班前已截止），不计成绩。")
	case h.item.Deadline.After(d.now):
		line("提交状态：未提交（作业进行中），尚无正式答卷。")
	default:
		line("提交状态：未提交（已截止），正式成绩计 0 分。")
	}
	if h.item.Deadline.After(d.now) {
		line("作业进行中，本文件为导出时的记录。")
	}
	results := map[string]class.HomeworkResult{}
	for _, result := range sub.Results {
		results[result.QuestionID] = result
	}
	for i, q := range h.item.Questions {
		if p.GetY() > 245 {
			p.AddPage()
		}
		p.Ln(5)
		p.SetFont("noto", "", 13)
		p.MultiCell(0, 8, fmt.Sprintf("第 %d 题（%d 分）", i+1, q.Points), "", "L", false)
		if err := homeworkPDFContent(p, q.Prompt); err != nil {
			return nil, fmt.Errorf("question %s: %w", q.ID, err)
		}
		for j, option := range q.Options {
			if err := homeworkPDFContent(p, fmt.Sprintf("%c. %s", 'A'+j, option)); err != nil {
				return nil, fmt.Errorf("question %s option %d: %w", q.ID, j, err)
			}
		}
		result, graded := results[q.ID]
		if !submitted {
			line("学生作答：未提交")
			continue
		}
		for blank := range q.Accepted {
			answer := ""
			if i < len(sub.Answers) && blank < len(sub.Answers[i]) {
				answer = strings.TrimSpace(sub.Answers[i][blank])
			}
			label := "学生作答"
			if len(q.Accepted) > 1 {
				label = fmt.Sprintf("第 %d 空作答", blank+1)
			}
			if answer == "" {
				answer = "未作答"
			} else if q.Kind != "blank" {
				if index, err := strconv.Atoi(answer); err == nil && index >= 0 && index < len(q.Options) {
					answer = string(rune('A' + index))
				}
			}
			if graded && blank < len(result.Correct) {
				judgement := "错误"
				if result.Correct[blank] {
					judgement = "正确"
				}
				answer += "（" + judgement + "）"
			}
			line(label + "：" + answer)
		}
		if graded {
			line(fmt.Sprintf("本题自动评分：%d / %d", result.Score, result.Total))
		} else {
			line("本题自动评分：暂无记录")
		}
	}
	var buffer bytes.Buffer
	if err := p.Output(&buffer); err != nil {
		return nil, err
	}
	return buffer.Bytes(), nil
}
