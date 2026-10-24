package classroom

import (
	"bytes"
	"encoding/csv"
	"errors"
	"io"
	"strconv"
	"strings"
	"unicode/utf8"

	"github.com/xuri/excelize/v2"
)

type studentRosterCandidate struct {
	line  int
	input StudentAccountInput
	valid bool
}

func parseStudentRoster(raw []byte) ([]studentRosterCandidate, error) {
	if len(raw) > StudentCSVMaxBytes {
		return nil, ErrStudentCSV
	}
	if bytes.HasPrefix(raw, []byte("PK\x03\x04")) {
		return parseStudentExcel(raw)
	}
	return parseStudentCSV(raw)
}

func parseStudentCSV(raw []byte) ([]studentRosterCandidate, error) {
	if !utf8.Valid(raw) {
		return nil, ErrStudentCSV
	}
	reader := csv.NewReader(bytes.NewReader(bytes.TrimPrefix(raw, []byte{0xef, 0xbb, 0xbf})))
	reader.TrimLeadingSpace = true
	reader.FieldsPerRecord = -1
	header, err := reader.Read()
	if err != nil || len(header) < 2 || len(header) > 3 {
		return nil, ErrStudentCSV
	}
	for i := range header {
		header[i] = strings.TrimSpace(header[i])
	}
	if (header[0] != "username" && header[0] != "学号" && header[0] != "账号") ||
		(header[1] != "displayName" && header[1] != "姓名") ||
		(len(header) == 3 && header[2] != "email" && header[2] != "邮箱") {
		return nil, ErrStudentCSV
	}
	candidates := make([]studentRosterCandidate, 0)
	for {
		fields, err := reader.Read()
		if errors.Is(err, io.EOF) {
			return candidates, nil
		}
		if err != nil || len(candidates) >= StudentCSVMaxRows {
			return nil, ErrStudentCSV
		}
		line, _ := reader.FieldPos(0)
		candidates = append(candidates, studentRosterCandidate{
			line: line, valid: len(fields) == len(header),
			input: StudentAccountInput{Username: rosterField(fields, 0), DisplayName: rosterField(fields, 1), Email: rosterField(fields, 2)},
		})
	}
}

func rosterField(fields []string, column int) string {
	if column < 0 || column >= len(fields) {
		return ""
	}
	return strings.TrimSpace(fields[column])
}

func rosterColumns(fields []string) (username, name, email int) {
	username, name, email = -1, -1, -1
	for column, value := range fields {
		switch strings.TrimSpace(value) {
		case "学号", "账号", "username":
			username = column
		case "姓名", "displayName":
			name = column
		case "邮箱", "email":
			email = column
		}
	}
	return
}

func parseStudentExcel(raw []byte) ([]studentRosterCandidate, error) {
	book, err := excelize.OpenReader(bytes.NewReader(raw), excelize.Options{
		UnzipSizeLimit: 16 << 20, UnzipXMLSizeLimit: 16 << 20,
	})
	if err != nil {
		return nil, ErrStudentCSV
	}
	defer book.Close() //nolint:errcheck
	// School exports have merged titles, course information and a two-row
	// header. Find the actual columns instead of relying on a fixed row/width.
	for _, sheet := range book.GetSheetList() {
		candidates, found, err := parseStudentExcelSheet(book, sheet)
		if err != nil {
			return nil, err
		}
		if found {
			if len(candidates) == 0 {
				return nil, ErrStudentCSV
			}
			return candidates, nil
		}
	}
	return nil, ErrStudentCSV
}

func parseStudentExcelSheet(book *excelize.File, sheet string) ([]studentRosterCandidate, bool, error) {
	rows, err := book.Rows(sheet)
	if err != nil {
		return nil, false, ErrStudentCSV
	}
	defer rows.Close() //nolint:errcheck
	username, name, email := -1, -1, -1
	candidates := make([]studentRosterCandidate, 0)
	for line := 1; rows.Next(); line++ {
		if line > 4096 {
			return nil, false, ErrStudentCSV
		}
		fields, err := rows.Columns()
		if err != nil {
			return nil, false, ErrStudentCSV
		}
		if username < 0 {
			username, name, email = rosterColumns(fields)
			if name < 0 {
				username = -1
			}
			if line >= 50 && username < 0 {
				return nil, false, nil
			}
			continue
		}
		id, displayName := rosterField(fields, username), rosterField(fields, name)
		if id == "" && displayName == "" {
			continue // Blank header continuation, attendance rows or footer.
		}
		if headerID, headerName, _ := rosterColumns(fields); headerID >= 0 && headerName >= 0 {
			continue // Repeated printed page header.
		}
		if len(candidates) >= StudentCSVMaxRows {
			return nil, true, ErrStudentCSV
		}
		// Keep text IDs and zero-padded number formats intact. Convert only
		// numeric cells displayed in scientific/decimal notation to plain digits.
		cell, _ := excelize.CoordinatesToCellName(username+1, line)
		kind, err := book.GetCellType(sheet, cell)
		if err != nil {
			return nil, true, ErrStudentCSV
		}
		if (kind == excelize.CellTypeNumber || kind == excelize.CellTypeUnset) && strings.ContainsAny(id, ".eE+") {
			raw, err := book.GetCellValue(sheet, cell, excelize.Options{RawCellValue: true})
			if err != nil {
				return nil, true, ErrStudentCSV
			}
			if value, err := strconv.ParseFloat(raw, 64); err == nil {
				id = strconv.FormatFloat(value, 'f', -1, 64)
			}
		}
		candidates = append(candidates, studentRosterCandidate{
			line: line, valid: true,
			input: StudentAccountInput{Username: id, DisplayName: displayName, Email: rosterField(fields, email)},
		})
	}
	if rows.Error() != nil {
		return nil, false, ErrStudentCSV
	}
	return candidates, username >= 0, nil
}
