package knowledgebase

import (
	_ "embed"
	"encoding/json"
)

// BuiltinPackage contains only public teaching notes, never exercise answers.
type BuiltinPackage struct {
	Key         string
	PublicID    string
	Version     string
	Digest      string
	Name        string
	Description string
	Documents   []BuiltinDocument
}

type BuiltinDocument struct {
	ID       string
	Markdown string
}

//go:embed content/signals.json
var signalsJSON []byte

// SignalsPackage returns a fresh copy so importers cannot mutate the embedded data.
func SignalsPackage() BuiltinPackage {
	var pack BuiltinPackage
	if err := json.Unmarshal(signalsJSON, &pack); err != nil {
		panic(err)
	}
	return pack
}
