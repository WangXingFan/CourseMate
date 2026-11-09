package exports

import "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/shared/apperr"

var (
	ErrProfileRequired = apperr.New("exports.profile_required", "complete and save the archive header information in the export center before exporting grades")
	ErrStalePreview    = apperr.New("exports.stale_preview", "grade data changed; refresh the preview before finalizing")
	// ErrInvalid indicates malformed export options.
	ErrInvalid = apperr.New("exports.invalid", "invalid export options")
	// ErrForbidden indicates that the caller does not own the classroom.
	ErrForbidden = apperr.New("exports.forbidden", "export access denied")
	// ErrNotFound indicates that the classroom is unavailable.
	ErrNotFound = apperr.New("exports.not_found", "classroom not found")
)
