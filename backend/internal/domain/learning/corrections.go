package learning

import (
	"crypto/sha256"
	"encoding/hex"
	"time"
)

const CorrectionVersion = "correction-v1"

// CorrectionSource retains the original grading key on the server. A correction
// is independent practice and never replaces a classroom or homework score.
type CorrectionSource struct {
	EvidenceID                                                             string
	ID, Source, Title, ConceptID, LessonID, OriginHref, ExternalReviewHref string
	At                                                                     time.Time
	Question                                                               CourseQuestion
	Answers                                                                map[string]string
	TextAnswers                                                            [][]string
	ReviewStage                                                            int
	NextReviewAt                                                           *time.Time
	LastReview                                                             *LessonAttempt
}

func CorrectionID(source, activity, question string) string {
	sum := sha256.Sum256([]byte(source + ":" + activity + ":" + question))
	return hex.EncodeToString(sum[:16])
}
