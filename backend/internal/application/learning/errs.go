package learning

import "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/shared/apperr"

var (
	ErrInvalid  = apperr.New("learning.invalid_attempt", "invalid learning attempt")
	ErrConflict = apperr.New("learning.attempt_conflict", "attempt ID already belongs to another answer")
)
