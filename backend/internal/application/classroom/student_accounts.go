package classroom

import (
	"context"
	"errors"
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
const StudentDefaultPassword = "student"

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
	hash, err := bcrypt.GenerateFromPassword([]byte(StudentDefaultPassword), 12)
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
	return &StudentCredential{Username: input.Username, DisplayName: input.DisplayName, InitialPassword: StudentDefaultPassword}, nil
}

// ImportStudentAccounts accepts an Excel attendance roster or UTF-8 CSV.
// Invalid rows and existing accounts never change existing credentials.
func (s *Service) ImportStudentAccounts(ctx context.Context, actor uint, publicID string, raw []byte) (*StudentImportResult, error) {
	classroom, err := s.owned(ctx, actor, publicID)
	if err != nil {
		return nil, err
	}
	// Validate the complete document before creating any accounts, so malformed
	// files and exceeded limits cannot produce an undisclosed partial import.
	candidates, err := parseStudentRoster(raw)
	if err != nil {
		return nil, err
	}
	result := &StudentImportResult{Total: len(candidates), Rows: []StudentImportRow{}, Credentials: []StudentCredential{}}
	seen := make(map[string]bool)
	for _, candidate := range candidates {
		if err := ctx.Err(); err != nil {
			return result, err
		}
		row := StudentImportRow{Line: candidate.line, Username: strings.TrimSpace(candidate.input.Username), Status: "invalid"}
		input, normalizeErr := normalizeStudent(candidate.input)
		switch {
		case !candidate.valid || normalizeErr != nil:
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
