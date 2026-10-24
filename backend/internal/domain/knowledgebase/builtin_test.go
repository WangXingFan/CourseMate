package knowledgebase

import (
	"bytes"
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"strings"
	"testing"

	domainlearning "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/learning"
)

func TestBundledKnowledgeContainsOnlyPublicCourseNotes(t *testing.T) {
	pack := SignalsPackage()
	course := domainlearning.CourseCatalog()
	if len(pack.Documents) != 52 || pack.Version != course.Version || pack.Key != course.ID {
		t.Fatal("bundled knowledge does not match the course version and coverage")
	}
	for index, document := range pack.Documents {
		lesson := course.Lessons[index]
		if document.ID != lesson.ID || !strings.Contains(document.Markdown, lesson.Markdown) {
			t.Fatalf("missing or mismatched note %s", lesson.ID)
		}
		if !strings.Contains(document.Markdown, "/learn/knowledge?lesson="+lesson.ID) {
			t.Fatalf("missing source link for %s", lesson.ID)
		}
	}
	// Strict decoding rejects accidental addition of grading fields to the
	// public package, including nested exercise answers and explanations.
	var decoded BuiltinPackage
	decoder := json.NewDecoder(strings.NewReader(string(signalsJSON)))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&decoded); err != nil {
		t.Fatal(err)
	}
	pack.Documents[0].Markdown = "changed"
	if SignalsPackage().Documents[0].Markdown == "changed" {
		t.Fatal("caller mutated the embedded notes")
	}
}

func TestBuiltinPackageDigestMatchesGeneratedDocuments(t *testing.T) {
	// The generator hashes JSON with lower-case field names. Hash its exact
	// compacted documents to catch missing content/version regeneration.
	var raw struct {
		Digest    string
		Documents json.RawMessage
	}
	if err := json.Unmarshal(signalsJSON, &raw); err != nil {
		t.Fatal(err)
	}
	var compact bytes.Buffer
	if err := json.Compact(&compact, raw.Documents); err != nil {
		t.Fatal(err)
	}
	if raw.Digest != fmt.Sprintf("%x", sha256.Sum256(compact.Bytes())) {
		t.Fatal("content digest does not match the bundled notes")
	}
}
