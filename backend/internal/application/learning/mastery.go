package learning

import (
	"context"
	domain "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/learning"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/repository"
)

func (s *Service) Mastery(ctx context.Context, userID uint) (domain.MasteryProfile, error) {
	if userID == 0 {
		return domain.MasteryProfile{}, ErrInvalid
	}
	profiles, err := s.MasteryProfiles(ctx, []uint{userID}, 0)
	return profiles[userID], err
}

// The classroom service authorizes the current roster before requesting this
// bulk read, so report size does not cause one database query per student.
func (s *Service) MasteryProfiles(ctx context.Context, users []uint, classroomID uint) (map[uint]domain.MasteryProfile, error) {
	repo, ok := s.repo.(repository.LearningMasteryRepository)
	if !ok {
		return nil, ErrInvalid
	}
	now := s.now().UTC()
	evidence, err := repo.MasteryEvidence(ctx, users, classroomID, now.AddDate(0, 0, -domain.MasteryWindowDays))
	if err != nil {
		return nil, err
	}
	byUser := map[uint][]domain.MasteryEvidence{}
	for _, item := range evidence {
		byUser[item.UserID] = append(byUser[item.UserID], item)
	}
	profiles := map[uint]domain.MasteryProfile{}
	for _, user := range users {
		profiles[user] = domain.BuildMastery(byUser[user], now)
	}
	return profiles, nil
}
