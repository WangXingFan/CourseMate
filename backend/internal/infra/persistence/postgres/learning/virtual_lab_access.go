package learning

import (
	"context"

	domainuser "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/user"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/infra/persistence/models"
)

func (r *Repo) VirtualLabAccess(ctx context.Context, userID uint) (map[string]bool, error) {
	access := map[string]bool{"L1": false, "L2": false, "L3": false}
	var user models.User
	if err := r.db.WithContext(ctx).Select("id", "role").First(&user, userID).Error; err != nil {
		return nil, err
	}
	if user.Role == domainuser.RoleTeacher || domainuser.IsAdminRole(user.Role) {
		return map[string]bool{"L1": true, "L2": true, "L3": true}, nil
	}
	if user.Role != domainuser.RoleStudent {
		return access, nil
	}
	var classroom models.Classroom
	err := r.db.WithContext(ctx).Model(&models.Classroom{}).
		Joins("JOIN classroom_students ON classroom_students.classroom_id = classrooms.id").
		Where("classroom_students.student_id = ?", userID).Limit(1).Find(&classroom).Error
	if err != nil {
		return nil, err
	}
	access["L1"], access["L2"], access["L3"] = classroom.Lab1Open, classroom.Lab2Open, classroom.Lab3Open
	return access, nil
}
