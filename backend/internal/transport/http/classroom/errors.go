package classroom

import "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/shared/apperr"

var errInvalidClassroomID = apperr.New("classroom.invalid_id", "invalid classroom id")
var errInvalidStudentID = apperr.New("classroom.invalid_student_id", "invalid student id")
var errInvalidQuizID = apperr.New("classroom.invalid_quiz_id", "invalid quiz id")
