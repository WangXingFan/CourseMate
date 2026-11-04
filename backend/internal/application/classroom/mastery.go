package classroom

import (
	"context"
	"errors"
	domain "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/learning"
)

type masteryReader interface {
	MasteryProfiles(context.Context, []uint, uint) (map[uint]domain.MasteryProfile, error)
}

func (s *Service) SetMasteryReader(reader masteryReader) { s.mastery = reader }

type MasteryStudent struct {
	ID, Name, Username string
	Counts             domain.MasteryCounts
	WeakConceptIDs     []string
}
type MasteryConceptSummary struct {
	Concept                            domain.MasteryConcept
	Assessed, Weak, Developing, Secure int
}
type MasteryReport struct {
	ClassroomID string
	Students    []MasteryStudent
	Concepts    []MasteryConceptSummary
}

func (s *Service) MasteryReport(ctx context.Context, actor uint, id string) (*MasteryReport, error) {
	classroom, err := s.readable(ctx, actor, id)
	if err != nil {
		return nil, err
	}
	students, err := s.repo.ListClassroomStudents(ctx, classroom.ID)
	if err != nil {
		return nil, err
	}
	if s.mastery == nil {
		return nil, errors.New("mastery reader not configured")
	}
	ids := make([]uint, 0, len(students))
	for _, student := range students {
		ids = append(ids, student.ID)
	}
	profiles, err := s.mastery.MasteryProfiles(ctx, ids, classroom.ID)
	if err != nil {
		return nil, err
	}
	report := &MasteryReport{ClassroomID: id, Students: []MasteryStudent{}, Concepts: []MasteryConceptSummary{}}
	for _, student := range students {
		profile := profiles[student.ID]
		if len(report.Concepts) == 0 {
			for _, concept := range profile.Concepts {
				concept.Evidence = nil
				concept.Status = ""
				concept.Questions, concept.Correct, concept.LastAt = 0, 0, nil
				if concept.Kind == "practice" {
					concept.PracticeHref = "/learn/quiz?topic=" + concept.Topic
				}
				report.Concepts = append(report.Concepts, MasteryConceptSummary{Concept: concept})
			}
		}
		row := MasteryStudent{ID: student.PublicID, Name: student.DisplayName, Username: student.Username, Counts: profile.Counts, WeakConceptIDs: []string{}}
		for i, concept := range profile.Concepts {
			item := &report.Concepts[i]
			if concept.Status != "unassessed" {
				item.Assessed++
			}
			switch concept.Status {
			case "weak":
				item.Weak++
				row.WeakConceptIDs = append(row.WeakConceptIDs, concept.ID)
			case "developing":
				item.Developing++
			case "secure":
				item.Secure++
			}
		}
		report.Students = append(report.Students, row)
	}
	return report, nil
}

func (s *Service) StudentMastery(ctx context.Context, actor uint, classroomID, studentID string) (domain.MasteryProfile, error) {
	classroom, err := s.readable(ctx, actor, classroomID)
	if err != nil {
		return domain.MasteryProfile{}, err
	}
	students, err := s.repo.ListClassroomStudents(ctx, classroom.ID)
	if err != nil {
		return domain.MasteryProfile{}, err
	}
	for _, student := range students {
		if student.PublicID != studentID {
			continue
		}
		if s.mastery == nil {
			return domain.MasteryProfile{}, errors.New("mastery reader not configured")
		}
		profiles, err := s.mastery.MasteryProfiles(ctx, []uint{student.ID}, classroom.ID)
		return profiles[student.ID], err
	}
	return domain.MasteryProfile{}, ErrStudentNotFound
}
