package classroom

import (
	"context"
	"errors"
	"fmt"
	"testing"

	"github.com/xuri/excelize/v2"
)

func attendanceRosterBook(t *testing.T) *excelize.File {
	t.Helper()
	book := excelize.NewFile()
	t.Cleanup(func() { _ = book.Close() })
	for _, pair := range [][2]string{{"A1", "Y2"}, {"A3", "Y3"}, {"F4", "I4"}, {"J4", "L4"}, {"M4", "Y4"}, {"F5", "Y5"}, {"H45", "O45"}, {"A46", "Y46"}} {
		if err := book.MergeCell("Sheet1", pair[0], pair[1]); err != nil {
			t.Fatal(err)
		}
	}
	for cell, value := range map[string]string{"A1": "点名册", "A3": "课程信息", "F4": "课程名称", "F5": "任课教师", "D45": "学生人数", "H45": "教师签字"} {
		if err := book.SetCellStr("Sheet1", cell, value); err != nil {
			t.Fatal(err)
		}
	}
	headers := []string{"序号", "学号", "姓名", "班级", "修读方式", "重修重考"}
	for lesson := 1; lesson <= 18; lesson++ {
		headers = append(headers, fmt.Sprint(lesson))
	}
	headers = append(headers, "总评")
	for index, header := range headers {
		cell, _ := excelize.CoordinatesToCellName(index+1, 6)
		end, _ := excelize.CoordinatesToCellName(index+1, 7)
		if err := book.MergeCell("Sheet1", cell, end); err != nil {
			t.Fatal(err)
		}
		if err := book.SetCellStr("Sheet1", cell, header); err != nil {
			t.Fatal(err)
		}
	}
	return book
}

func rosterBookBytes(t *testing.T, book *excelize.File) []byte {
	t.Helper()
	buffer, err := book.WriteToBuffer()
	if err != nil {
		t.Fatal(err)
	}
	return buffer.Bytes()
}

func TestParseStudentRosterRecognizesAttendanceLayoutAndPreservesIDs(t *testing.T) {
	book := attendanceRosterBook(t)
	for cell, value := range map[string]any{
		"A8": 1, "B8": "00123456789", "C8": "示例甲", "D8": "示例班", "E8": "主修", "F8": "正常",
		"B9": 20260000002, "C9": "示例乙", "B10": 20260000003, "C10": "示例丙", "B11": 123, "C11": "示例丁",
	} {
		if err := book.SetCellValue("Sheet1", cell, value); err != nil {
			t.Fatal(err)
		}
	}
	style, err := book.NewStyle(&excelize.Style{NumFmt: 11})
	if err != nil {
		t.Fatal(err)
	}
	if err := book.SetCellStyle("Sheet1", "B10", "B10", style); err != nil {
		t.Fatal(err)
	}
	padding := "00000000000"
	style, err = book.NewStyle(&excelize.Style{CustomNumFmt: &padding})
	if err != nil {
		t.Fatal(err)
	}
	if err := book.SetCellStyle("Sheet1", "B11", "B11", style); err != nil {
		t.Fatal(err)
	}
	candidates, err := parseStudentRoster(rosterBookBytes(t, book))
	if err != nil {
		t.Fatal(err)
	}
	want := []string{"00123456789", "20260000002", "20260000003", "00000000123"}
	if len(candidates) != len(want) {
		t.Fatalf("candidate count = %d, want %d", len(candidates), len(want))
	}
	for index, candidate := range candidates {
		if candidate.line != index+8 || candidate.input.Username != want[index] || candidate.input.Email != "" || !candidate.valid {
			t.Fatalf("candidate %d = %#v", index, candidate)
		}
	}
}

func TestImportStudentAccountsExcelReportsOriginalRowsAndDuplicates(t *testing.T) {
	book := attendanceRosterBook(t)
	for row, fields := range map[int][]any{
		8:  {1, "20260000001", "示例甲", "示例班"},
		9:  {2, "20260000001", "重复", "示例班"},
		11: {3, "ab", "无效", "示例班"},
	} {
		if err := book.SetSheetRow("Sheet1", fmt.Sprintf("A%d", row), &fields); err != nil {
			t.Fatal(err)
		}
	}
	service, repo := newClassroomTestService()
	raw := rosterBookBytes(t, book)
	result, err := service.ImportStudentAccounts(context.Background(), 1, "class_one", raw)
	if err != nil {
		t.Fatal(err)
	}
	if result.Total != 3 || result.Created != 1 || result.Skipped != 1 || result.Failed != 1 || len(repo.studentAccountRecords) != 1 {
		t.Fatalf("unexpected import counts: %#v", result)
	}
	for index, want := range []struct {
		line   int
		status string
	}{{8, "created"}, {9, "duplicate"}, {11, "invalid"}} {
		if result.Rows[index].Line != want.line || result.Rows[index].Status != want.status {
			t.Fatalf("unexpected row result: %#v", result.Rows[index])
		}
	}
	if len(result.Credentials) != 1 || result.Credentials[0].DisplayName != "示例甲" {
		t.Fatal("student name was not imported from the name column")
	}
	if _, err := service.ImportStudentAccounts(context.Background(), 2, "class_one", raw); !errors.Is(err, ErrNotFound) {
		t.Fatalf("another teacher imported the roster: %v", err)
	}
}

func TestParseStudentRosterFindsColumnsAfterCoverSheet(t *testing.T) {
	book := excelize.NewFile()
	t.Cleanup(func() { _ = book.Close() })
	if _, err := book.NewSheet("名单"); err != nil {
		t.Fatal(err)
	}
	for cell, value := range map[string]string{"A3": "姓名", "C3": "学号", "E3": "邮箱", "A4": "示例甲", "C4": "00123456789", "E4": "student@example.edu", "A5": "姓名", "C5": "学号"} {
		if err := book.SetCellStr("名单", cell, value); err != nil {
			t.Fatal(err)
		}
	}
	candidates, err := parseStudentRoster(rosterBookBytes(t, book))
	if err != nil || len(candidates) != 1 {
		t.Fatalf("reordered roster = %#v, %v", candidates, err)
	}
	if candidates[0].line != 4 || candidates[0].input.Username != "00123456789" || candidates[0].input.Email != "student@example.edu" {
		t.Fatalf("wrong column mapping: %#v", candidates[0])
	}
}

func TestImportStudentAccountsRejectsInvalidExcelBeforeCreating(t *testing.T) {
	book := attendanceRosterBook(t)
	if err := book.UnmergeCell("Sheet1", "A46", "Y46"); err != nil {
		t.Fatal(err)
	}
	for row := 8; row < 8+StudentCSVMaxRows+1; row++ {
		if err := book.SetCellStr("Sheet1", fmt.Sprintf("B%d", row), fmt.Sprintf("s%010d", row)); err != nil {
			t.Fatal(err)
		}
		if err := book.SetCellStr("Sheet1", fmt.Sprintf("C%d", row), "示例学生"); err != nil {
			t.Fatal(err)
		}
	}
	empty := excelize.NewFile()
	t.Cleanup(func() { _ = empty.Close() })
	for name, raw := range map[string][]byte{
		"too many students": rosterBookBytes(t, book),
		"missing header":    rosterBookBytes(t, empty),
		"corrupt XLSX":      []byte("PK\x03\x04broken"),
		"too large":         make([]byte, StudentCSVMaxBytes+1),
	} {
		t.Run(name, func(t *testing.T) {
			service, repo := newClassroomTestService()
			if _, err := service.ImportStudentAccounts(context.Background(), 1, "class_one", raw); !errors.Is(err, ErrStudentCSV) {
				t.Fatalf("invalid workbook error = %v", err)
			}
			if len(repo.studentAccountRecords) != 0 {
				t.Fatal("invalid workbook created a partial set of accounts")
			}
		})
	}
}
