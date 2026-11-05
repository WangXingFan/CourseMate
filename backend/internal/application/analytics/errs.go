package analytics

import "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/shared/apperr"

var (
	ErrForbidden = apperr.New("analytics.forbidden", "teacher or administrator account required")
	ErrInvalid   = apperr.New("analytics.invalid", "invalid analytics request")
	ErrClassroom = apperr.New("analytics.classroom", "classroom unavailable")
)
