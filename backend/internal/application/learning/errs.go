package learning

import "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/shared/apperr"

var (
	ErrQuestionBankForbidden = apperr.New("learning.question_bank_forbidden", "question bank requires a teacher or administrator")
	ErrVirtualLabClosed      = apperr.New("learning.virtual_lab_closed", "the teacher has not opened this experiment")
	ErrCourseAssigned        = apperr.New("learning.teacher_assigned", "answer course questions through a teacher-published classroom quiz")
	ErrInvalid               = apperr.New("learning.invalid_attempt", "invalid learning attempt")
	ErrConflict              = apperr.New("learning.attempt_conflict", "attempt ID already belongs to another answer")
	ErrVirtualLabConflict    = apperr.New("learning.virtual_lab_conflict", "experiment record changed in another window")
)
