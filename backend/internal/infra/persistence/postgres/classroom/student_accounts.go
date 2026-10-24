package classroom

import (
	"context"

	domainuser "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/user"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/infra/persistence/dberror"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/infra/persistence/models"
	userrepo "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/infra/persistence/postgres/user"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/repository"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// CreateClassroomStudentAccount creates the account, credential and membership
// in one transaction; concurrent classroom deletion cannot leave an orphan user.
func (r *Repo) CreateClassroomStudentAccount(ctx context.Context, classroomID, teacherID uint, record repository.UserImportRecord) error {
	if classroomID == 0 || teacherID == 0 || record.User.Role != domainuser.RoleStudent {
		return repository.ErrInvalidInput
	}
	return dberror.Translate(r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var classroom models.Classroom
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("id = ? AND teacher_id = ?", classroomID, teacherID).First(&classroom).Error; err != nil {
			return err
		}
		if record.User.Email != "" {
			var count int64
			if err := tx.Model(&models.User{}).Where("LOWER(email) = LOWER(?)", record.User.Email).Count(&count).Error; err != nil {
				return err
			}
			if count > 0 {
				return repository.ErrDuplicate
			}
		}
		if err := userrepo.NewRepo(tx).CreateWithCredential(ctx, repository.CreateWithCredentialInput{
			User: &record.User, Credential: record.Credential,
		}); err != nil {
			return err
		}
		return tx.Create(&models.ClassroomStudent{ClassroomID: classroom.ID, StudentID: record.User.ID}).Error
	}))
}
