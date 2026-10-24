package classroom

import "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/shared/apperr"

var (
	ErrForbidden       = apperr.New("classroom.forbidden", "teacher account required")
	ErrNotFound        = apperr.New("classroom.not_found", "classroom not found")
	ErrInvalid         = apperr.New("classroom.invalid", "invalid classroom details")
	ErrStudentNotFound = apperr.New("classroom.student_not_found", "student account not found")
	ErrAssigned        = apperr.New("classroom.student_assigned", "student already belongs to a classroom")
	ErrStudentExists   = apperr.New("classroom.student_exists", "student username or email already exists")
	ErrStudentInvalid  = apperr.New("classroom.student_invalid", "invalid student account details")
	ErrStudentCSV      = apperr.New("classroom.student_csv_invalid", "invalid student CSV or too many rows")
	ErrQuizNotFound    = apperr.New("classroom.quiz_not_found", "quiz not found")
	ErrQuizInvalid     = apperr.New("classroom.quiz_invalid", "invalid quiz")
	ErrQuizClosed      = apperr.New("classroom.quiz_closed", "quiz is not open")
	ErrQuizSubmitted   = apperr.New("classroom.quiz_already_submitted", "quiz already submitted")
	ErrNotInClassroom  = apperr.New("classroom.not_joined", "student has not joined a classroom")
)
