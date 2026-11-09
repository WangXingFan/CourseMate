package classroom

import (
	learning "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/learning"
	"time"
)

type PracticeRecipient struct {
	StudentID                      uint
	PublicID, Name, BaselineStatus string
}

// Targeted practice is formative work, separate from graded classroom quizzes.
type PracticeAssignment struct {
	ID                         uint
	PublicID                   string
	ClassroomID, TeacherID     uint
	ConceptID, LessonID, Title string
	Questions                  []learning.PracticeQuestion
	Recipients                 []PracticeRecipient
	Deadline, CreatedAt        time.Time
}

func (a PracticeAssignment) Includes(studentID uint) bool {
	for _, recipient := range a.Recipients {
		if recipient.StudentID == studentID {
			return true
		}
	}
	return false
}

type PracticeSubmission struct {
	AssignmentID, StudentID uint
	Attempts                []learning.LessonAttempt
	Correct                 int
	SubmittedAt             time.Time
}
