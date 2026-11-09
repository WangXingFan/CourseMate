package classroom

import "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/shared/apperr"

var (
	ErrPracticeInvalid   = apperr.New("classroom.practice_invalid", "select 3 to 5 questions, current students and a future deadline")
	ErrPracticeNotFound  = apperr.New("classroom.practice_not_found", "practice assignment not found")
	ErrPracticeClosed    = apperr.New("classroom.practice_closed", "practice assignment has closed")
	ErrPracticeSubmitted = apperr.New("classroom.practice_submitted", "practice assignment already submitted")
	ErrForbidden         = apperr.New("classroom.forbidden", "teacher account required")
	ErrNotFound          = apperr.New("classroom.not_found", "classroom not found")
	ErrInvalid           = apperr.New("classroom.invalid", "invalid classroom details")
	ErrStudentNotFound   = apperr.New("classroom.student_not_found", "student account not found")
	ErrAssigned          = apperr.New("classroom.student_assigned", "student already belongs to a classroom")
	ErrStudentExists     = apperr.New("classroom.student_exists", "student username or email already exists")
	ErrStudentInvalid    = apperr.New("classroom.student_invalid", "invalid student account details")
	ErrStudentCSV        = apperr.New("classroom.student_csv_invalid", "invalid student roster or too many rows")
	ErrQuizNotFound      = apperr.New("classroom.quiz_not_found", "quiz not found")
	ErrQuizInvalid       = apperr.New("classroom.quiz_invalid", "invalid quiz")
	ErrQuizClosed        = apperr.New("classroom.quiz_closed", "quiz is not open")
	ErrQuizSubmitted     = apperr.New("classroom.quiz_already_submitted", "quiz already submitted")
	ErrNotInClassroom    = apperr.New("classroom.not_joined", "student has not joined a classroom")
	ErrHomeworkNotFound  = apperr.New("classroom.homework_not_found", "homework not found")
	ErrHomeworkInvalid   = apperr.New("classroom.homework_invalid", "invalid homework or schedule")
	ErrHomeworkWindow    = apperr.New("classroom.homework_window", "homework is outside its submission window")
	ErrHomeworkSubmitted = apperr.New("classroom.homework_submitted", "homework already submitted")
	ErrHomeworkAnswers   = apperr.New("classroom.homework_answers", "complete all homework answers")
)
