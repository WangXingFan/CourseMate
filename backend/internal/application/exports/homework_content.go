package exports

import (
	"bytes"
	"embed"
	"fmt"
	"math"
	"regexp"
	"strings"

	"github.com/go-pdf/fpdf"
)

// These are the original question-bank diagrams, bundled for offline exports.
//
//go:embed homework-images/*.png
var homeworkImages embed.FS

var homeworkImagePattern = regexp.MustCompile(`!\[([^\]]*)\]\(([^)]+)\)`)

func homeworkPDFContent(p *fpdf.Fpdf, text string) error {
	line := func(value string) {
		if strings.TrimSpace(value) != "" {
			p.SetFont("noto", "", 10)
			p.MultiCell(0, 6, homeworkPDFText(value), "", "L", false)
		}
	}
	end := 0
	for _, match := range homeworkImagePattern.FindAllStringSubmatchIndex(text, -1) {
		line(text[end:match[0]])
		path := text[match[4]:match[5]]
		if !strings.HasPrefix(path, "/learning/homework/") {
			return fmt.Errorf("unsupported homework diagram %q", path)
		}
		data, err := homeworkImages.ReadFile("homework-images/" + strings.TrimPrefix(path, "/learning/homework/"))
		if err != nil {
			return err
		}
		options := fpdf.ImageOptions{ImageType: "PNG"}
		info := p.RegisterImageOptionsReader(path, options, bytes.NewReader(data))
		if p.Error() != nil {
			return p.Error()
		}
		width, height := info.Extent()
		scale := math.Min(1, math.Min(155/width, 60/height))
		width, height = width*scale, height*scale
		if p.GetY()+height > 275 {
			p.AddPage()
		}
		p.ImageOptions(path, 18, p.GetY(), width, height, true, options, 0, "")
		p.Ln(2)
		end = match[1]
	}
	line(text[end:])
	return nil
}

// Keep mathematical meaning in searchable PDF text without a browser or TeX
// runtime. Fractions and grouped exponents use explicit parentheses.
func homeworkPDFText(text string) string {
	pos := 0
	var read func() string
	group := func() string {
		for pos < len(text) && text[pos] == ' ' {
			pos++
		}
		if pos < len(text) && text[pos] == '{' {
			pos++
			return read()
		}
		return ""
	}
	symbols := map[string]string{"left": "", "right": "", "pi": "π", "omega": "ω", "delta": "δ", "varepsilon": "ε", "infty": "∞", "int": "∫", "ne": "≠", "prime": "′", "sin": "sin", "cos": "cos", "cdot": "·", "times": "×"}
	read = func() string {
		var result strings.Builder
		for pos < len(text) {
			ch := text[pos]
			pos++
			switch ch {
			case '}':
				return result.String()
			case '{':
				result.WriteString("(" + read() + ")")
			case '$':
			case '\\':
				start := pos
				for pos < len(text) && (text[pos] >= 'a' && text[pos] <= 'z' || text[pos] >= 'A' && text[pos] <= 'Z') {
					pos++
				}
				command := text[start:pos]
				switch command {
				case "frac":
					numerator := group()
					result.WriteString("(" + numerator + ")/(" + group() + ")")
				case "sqrt":
					result.WriteString("√(" + group() + ")")
				case "":
					if pos < len(text) && strings.ContainsRune(",!; ", rune(text[pos])) {
						pos++
						result.WriteByte(' ')
					} else {
						result.WriteByte('\\')
					}
				default:
					if value, ok := symbols[command]; ok {
						result.WriteString(value)
					} else {
						result.WriteString("\\" + command)
					}
				}
			default:
				result.WriteByte(ch)
			}
		}
		return result.String()
	}
	return read()
}
