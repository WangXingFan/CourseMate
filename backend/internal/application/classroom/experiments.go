package classroom

import "context"

func (s *Service) SetExperiment(ctx context.Context, actor uint, classroomID, courseID string, open bool) error {
	if courseID != "L1" && courseID != "L2" && courseID != "L3" {
		return ErrInvalid
	}
	if _, err := s.owned(ctx, actor, classroomID); err != nil {
		return err
	}
	return s.repo.SetClassroomExperiment(ctx, classroomID, actor, courseID, open)
}
