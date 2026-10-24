package learning

import "testing"

func TestCatalogCompleteness(t *testing.T) {
	seen := map[string]bool{}
	misconceptions := map[string]bool{}
	if len(Variants()) != 160 {
		t.Fatal("expected 160 variants")
	}
	for _, question := range Questions() {
		if len(question.Misconceptions) != 3 {
			t.Fatal("missing diagnosis")
		}
		for option, code := range question.Misconceptions {
			if option == question.Answer || code == "" || misconceptions[code] {
				t.Fatal("invalid diagnosis mapping")
			}
			misconceptions[code] = true
		}
		for stage := 0; stage <= 5; stage++ {
			if FindVariant(SuggestedVariant(question.ID, stage)) == nil {
				t.Fatal("missing suggested variant")
			}
		}
	}
	if len(misconceptions) != 240 {
		t.Fatal("expected 240 diagnoses")
	}
	for _, variant := range Variants() {
		if seen[variant.ID] || FindQuestion(variant.BaseQuestionID) == nil || variant.Answer < 0 || variant.Answer > 3 {
			t.Fatal("invalid variant")
		}
		seen[variant.ID] = true
		for _, text := range []VariantText{variant.ZH, variant.EN} {
			if text.Prompt == "" || text.Explanation == "" || len(text.Options) != 4 {
				t.Fatal("incomplete translation")
			}
			for _, option := range text.Options {
				if option == "" {
					t.Fatal("empty option")
				}
			}
		}
	}
}
