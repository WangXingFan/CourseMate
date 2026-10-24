package classroom

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/csv"
	"errors"
	"io"
	"strings"
	"time"
	"unicode"
	"unicode/utf8"

	userapp "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/application/user"
	domainuser "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/user"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/repository"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

const StudentCSVMaxBytes = 1 << 20
const StudentCSVMaxRows = 200

type StudentAccountInput struct {
	Username    string
	DisplayName string
	Email       string
}

type StudentCredential struct {
	Username        string
	DisplayName     string
	InitialPassword string
}

type StudentImportRow struct {
	Line     int
	Username string
	Status   string
}

type StudentImportResult struct {
	Total       int
	Created     int
	Skipped     int
	Failed      int
	Rows        []StudentImportRow
	Credentials []StudentCredential
}

func normalizeStudent(input StudentAccountInput) (StudentAccountInput, error) {
	username, err := userapp.NormalizeUsername(input.Username)
	if err != nil {
		return input, ErrStudentInvalid
	}
	name := strings.TrimSpace(input.DisplayName)
	if name == "" {
		name = username
	}
	if !utf8.ValidString(name) || utf8.RuneCountInString(name) > 128 || strings.IndexFunc(name, unicode.IsControl) >= 0 {
		return input, ErrStudentInvalid
	}
	email, err := userapp.NormalizeEmail(input.Email)
	if err != nil {
		return input, ErrStudentInvalid
	}
	return StudentAccountInput{Username: username, DisplayName: name, Email: email}, nil
}

func (s *Service) CreateStudentAccount(ctx context.Context, actor uint, publicID string, input StudentAccountInput) (*StudentCredential, error) {
	classroom, err := s.owned(ctx, actor, publicID)
	if err != nil {
		return nil, err
	}
	input, err = normalizeStudent(input)
	if err != nil {
		return nil, err
	}
	return s.createStudentAccount(ctx, actor, classroom.ID, input)
}

func (s *Service) createStudentAccount(ctx context.Context, actor, classroomID uint, input StudentAccountInput) (*StudentCredential, error) {
	secret := make([]byte, 15)
	if _, err := rand.Read(secret); err != nil {
		return nil, err
	}
	password := base64.RawURLEncoding.EncodeToString(secret)
	hash, err := bcrypt.GenerateFromPassword([]byte(password), 12)
	if err != nil {
		return nil, err
	}
	now := time.Now()
	err = s.repo.CreateClassroomStudentAccount(ctx, classroomID, actor, repository.UserImportRecord{
		User: domainuser.User{
			PublicID: strings.ReplaceAll(uuid.NewString(), "-", ""),
			Username: input.Username, DisplayName: input.DisplayName, Email: input.Email,
			EmailSource: domainuser.EmailSourceAdminSet, Role: domainuser.RoleStudent,
			Status: domainuser.StatusActive, Timezone: "Asia/Shanghai", Locale: "zh-CN",
		},
		Credential: domainuser.Credential{
			PasswordHash: string(hash), PasswordAlgo: "bcrypt", PasswordEnabled: true,
			PasswordUpdatedAt: &now, PasswordSetAt: &now,
			PasswordOrigin: domainuser.PasswordOriginAdminCreated, MustResetPassword: true,
		},
	})
	if errors.Is(err, repository.ErrDuplicate) || errors.Is(err, repository.ErrDuplicateUsername) || errors.Is(err, repository.ErrConflict) {
		return nil, ErrStudentExists
	}
	if err != nil {
		return nil, mapError(err)
	}
	return &StudentCredential{Username: input.Username, DisplayName: input.DisplayName, InitialPassword: password}, nil
}

// ImportStudentAccounts accepts UTF-8 CSV (including Excel's BOM). Invalid rows
// and existing accounts are reported without changing existing credentials.
func (s *Service) ImportStudentAccounts(ctx context.Context, actor uint, publicID string, raw []byte) (*StudentImportResult, error) {
	classroom, err := s.owned(ctx, actor, publicID)
	if err != nil {
		return nil, err
	}
	if len(raw) > StudentCSVMaxBytes || !utf8.Valid(raw) {
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
	// Parse the whole document before creating any accounts: malformed CSV or an
	// exceeded row limit must not cause an undisclosed partial import.
	type candidate struct {
		line   int
		fields []string
	}
	candidates := make([]candidate, 0)
	for {
		fields, readErr := reader.Read()
		if errors.Is(readErr, io.EOF) {
			break
		}
		if readErr != nil || len(candidates) >= StudentCSVMaxRows {
			return nil, ErrStudentCSV
		}
		line, _ := reader.FieldPos(0)
		candidates = append(candidates, candidate{line: line, fields: fields})
	}
	result := &StudentImportResult{Total: len(candidates), Rows: []StudentImportRow{}, Credentials: []StudentCredential{}}
	seen := make(map[string]bool)
	for _, candidate := range candidates {
		if err := ctx.Err(); err != nil {
			return result, err
		}
		fields := candidate.fields
		row := StudentImportRow{Line: candidate.line, Username: strings.TrimSpace(fields[0]), Status: "invalid"}
		input := StudentAccountInput{Username: fields[0]}
		if len(fields) >= 2 {
			input.DisplayName = fields[1]
		}
		if len(fields) == 3 {
			input.Email = fields[2]
		}
		input, normalizeErr := normalizeStudent(input)
		switch {
		case len(fields) != len(header) || normalizeErr != nil:
			result.Failed++
		case seen[input.Username]:
			row.Status = "duplicate"
			result.Skipped++
		default:
			seen[input.Username] = true
			credential, createErr := s.createStudentAccount(ctx, actor, classroom.ID, input)
			switch {
			case createErr == nil:
				row.Status = "created"
				result.Created++
				result.Credentials = append(result.Credentials, *credential)
			case errors.Is(createErr, ErrStudentExists):
				row.Status = "exists"
				result.Skipped++
			default:
				row.Status = "failed"
				result.Failed++
			}
		}
		result.Rows = append(result.Rows, row)
	}
	return result, nil
}
