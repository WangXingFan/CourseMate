package classroom

import (
	"bytes"
	"encoding/json"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"testing"

	appclassroom "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/application/classroom"
	"github.com/xuri/excelize/v2"
)

func TestImportStudentAccountsFileAcceptsExcelAttendanceRoster(t *testing.T) {
	book := excelize.NewFile()
	defer book.Close() //nolint:errcheck
	for cell, value := range map[string]string{"A1": "点名册", "A6": "序号", "B6": "学号", "C6": "姓名", "D6": "班级", "Y6": "总评", "B8": "00123456789", "C8": "示例学生"} {
		if err := book.SetCellStr("Sheet1", cell, value); err != nil {
			t.Fatal(err)
		}
	}
	buffer, err := book.WriteToBuffer()
	if err != nil {
		t.Fatal(err)
	}

	tests := []struct {
		name, filename, path, actor string
		raw                         []byte
		status                      int
	}{
		{name: "attendance XLSX", filename: "点名册.xlsx", raw: buffer.Bytes(), status: http.StatusOK},
		{name: "uppercase extension", filename: "roster.XLSX", raw: buffer.Bytes(), status: http.StatusOK},
		{name: "CSV compatibility", filename: "roster.csv", raw: []byte("学号,姓名\n00123456789,示例学生\n"), status: http.StatusOK},
		{name: "student forbidden", filename: "点名册.xlsx", raw: buffer.Bytes(), actor: "4", status: http.StatusForbidden},
		{name: "other class", filename: "点名册.xlsx", raw: buffer.Bytes(), path: "other_class", status: http.StatusNotFound},
		{name: "unsupported type", filename: "roster.pdf", raw: buffer.Bytes(), status: http.StatusBadRequest},
		{name: "malformed workbook", filename: "roster.xlsx", raw: []byte("PK\x03\x04broken"), status: http.StatusBadRequest},
		{name: "too large", filename: "roster.xlsx", raw: make([]byte, appclassroom.StudentCSVMaxBytes+1), status: http.StatusBadRequest},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			router, _ := newClassroomHandlerTest(t)
			var body bytes.Buffer
			writer := multipart.NewWriter(&body)
			part, err := writer.CreateFormFile("file", test.filename)
			if err != nil {
				t.Fatal(err)
			}
			if _, err := part.Write(test.raw); err != nil {
				t.Fatal(err)
			}
			if err := writer.Close(); err != nil {
				t.Fatal(err)
			}
			id := test.path
			if id == "" {
				id = "class_one"
			}
			request := httptest.NewRequest(http.MethodPost, "/api/v1/classrooms/"+id+"/students/accounts/import/file", &body)
			request.Header.Set("Content-Type", writer.FormDataContentType())
			request.Header.Set("X-Test-User-ID", test.actor)
			recorder := httptest.NewRecorder()
			router.ServeHTTP(recorder, request)
			if recorder.Code != test.status {
				t.Fatalf("upload status = %d, want %d, body = %s", recorder.Code, test.status, recorder.Body.String())
			}
			if recorder.Header().Get("Cache-Control") != "no-store" {
				t.Fatal("roster response may be cached")
			}
			if test.status == http.StatusOK {
				var payload struct {
					Data ClassroomStudentImportResponse `json:"data"`
				}
				if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
					t.Fatal(err)
				}
				if payload.Data.Created != 1 || len(payload.Data.Credentials) != 1 || payload.Data.Credentials[0].Username != "00123456789" || payload.Data.Credentials[0].InitialPassword != "student" {
					t.Fatal("upload did not create the expected student account")
				}
				if test.filename != "roster.csv" && payload.Data.Rows[0].Line != 8 {
					t.Fatalf("Excel row number = %d, want 8", payload.Data.Rows[0].Line)
				}
			}
		})
	}
}
