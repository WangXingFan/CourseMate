// Legacy question banks mix plain signal expressions with Markdown math.
// Normalize only question display text; saved answers and grading stay unchanged.
const protectedContent = /(```[\s\S]*?```|~~~[\s\S]*?~~~|`[^`\n]*`|\$\$[\s\S]*?\$\$|(?<!\\)\$[^$\n]+\$|\\\([\s\S]*?\\\)|\\\[[\s\S]*?\\\]|!?\[[^\]\n]*\]\([^\n)]*\)|<\/?[A-Za-z][^>\n]*>)/g;
const mathWord = "(?:sin|cos|tan|exp|log10|log|ln|lim|max|min|floor|sinc|Re|Im|RC|ROC|Rxx|Rxy|fmax|fs|fc|fm|fq|td|t0|f0|Ts|Mp|yzi|yzs|Ce|Ae|Be|ns|sLI|sF|HX|AT|dt|dx|dy|kHz|Hz|rad|ms|kΩ|μF|dB|[A-Za-z])(?![A-Za-z])";
const mathToken = String.raw`(?:\\[A-Za-z]+|at(?=\))|tu(?=\()|${mathWord}|\d+(?:\.\d+)?|[Α-ω∞∫Σ√δπΩτζσφωαβλΔε±∓≤≥≠≈∝→←×·∗−′″⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻ᵗⁿᵢ₀₁₂₃₄₅₆₇₈₉₊₋ₙᵢₜ_^{}()[\]|=<>+*/!%,.'-])`;
const bareMath = new RegExp(String.raw`(?<![A-Za-z\\])${mathToken}(?:[ \t]*${mathToken})*`, "g");
const symbols: Record<string, string> = {
  "−": "-", "×": "\\times ", "·": "\\cdot ", "∗": "*", "∞": "\\infty ",
  "∫": "\\int ", "Σ": "\\Sigma ", "√": "\\sqrt ",
  "≤": "\\le ", "≥": "\\ge ", "≠": "\\ne ", "≈": "\\approx ", "∝": "\\propto ",
  "→": "\\to ", "←": "\\leftarrow ", "±": "\\pm ", "∓": "\\mp ",
  "α": "\\alpha ", "β": "\\beta ", "δ": "\\delta ", "ε": "\\varepsilon ",
  "ζ": "\\zeta ", "λ": "\\lambda ", "π": "\\pi ", "σ": "\\sigma ",
  "τ": "\\tau ", "φ": "\\varphi ", "ω": "\\omega ", "Δ": "\\Delta ", "Ω": "\\Omega ",
  "′": "'", "″": "''", "%": "\\%",
};
const superscripts: Record<string, string> = Object.fromEntries([..."⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻ᵗⁿᵢ"].map((c, i) => [c, [..."0123456789+-tni"][i]]));
const subscripts: Record<string, string> = Object.fromEntries([..."₀₁₂₃₄₅₆₇₈₉₊₋ₙᵢₜ"].map((c, i) => [c, [..."0123456789+-nit"][i]]));

function groupLegacyArguments(source: string): string {
  let result = "";
  for (let i = 0; i < source.length; i++) {
    if (!["^", "√"].includes(source[i]) || source[i + 1] !== "(") { result += source[i]; continue; }
    let depth = 1, end = i + 2;
    for (; end < source.length && depth; end++) {
      if (source[end] === "(") depth++;
      if (source[end] === ")") depth--;
    }
    if (depth) { result += source[i]; continue; }
    result += `${source[i]}{${groupLegacyArguments(source.slice(i + 2, end - 1))}}`;
    i = end - 1;
  }
  return result;
}

function legacyLatex(source: string): string {
  let value = source
    .replace(/∫₀∞/g, "\\int_{0}^{\\infty}")
    .replace(/∫₋∞ᵗ/g, "\\int_{-\\infty}^{t}")
    .replace(/Σ(?=[₀-₉ₙᵢ])/g, "\\sum ")
    .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻ᵗⁿᵢ]+/g, (text) => `^{${[...text].map((c) => superscripts[c]).join("")}}`)
    .replace(/[₀₁₂₃₄₅₆₇₈₉₊₋ₙᵢₜ]+/g, (text) => `_{${[...text].map((c) => subscripts[c]).join("")}}`);
  value = groupLegacyArguments(value).replace(/ω(n|c|0)/g, "ω_{$1}");
  value = value.replace(/[−×·∗∞∫Σ√≤≥≠≈∝→←±∓αβδεζλπστφωΔΩ′″%]/g, (symbol) => symbols[symbol]);
  value = value.replace(/(?<![A-Za-z\\])(sin|cos|tan|exp|ln|lim|max|min)(?![A-Za-z])/g, "\\$1 ")
    .replace(/(?<![A-Za-z\\])log10(?![A-Za-z])/g, "\\log_{10} ")
    .replace(/(?<![A-Za-z\\])log(?![A-Za-z])/g, "\\log ")
    .replace(/(?<![A-Za-z\\])(Re|Im|sinc|floor)(?![A-Za-z])/g, "\\operatorname{$1}")
    .replace(/(?<![A-Za-z\\])(kHz|Hz|rad|ms|dB)(?![A-Za-z])/g, "\\,\\mathrm{$1}")
    .replace(/(?<![A-Za-z\\])(fs|fc|fm|fq|td|t0|f0|Ts|Mp|Rxx|Rxy|yzi|yzs)(?![A-Za-z])/g, (token) => `${token[0]}_{${token.slice(1)}}`)
    .replace(/(?<![A-Za-z\\])fmax(?![A-Za-z])/g, "f_{\\max}")
    .replace(/(?<![A-Za-z0-9_^}\\])([A-Za-z]|\d+)\/\(([^()]+)\)/g, "\\frac{$1}{$2}");
  return value.trim();
}

export function normalizeQuestionMath(content: string): string {
  return content.split(protectedContent).map((fragment, index) => {
    // Captured fragments already carry explicit markup or literal content.
    if (index % 2) return fragment;
    return fragment.replace(bareMath, (candidate) => {
      const expression = candidate.replace(/[\s.,;:+\-*/=<>]+$/, "");
      const suffix = candidate.slice(expression.length);
      if (!/[A-Za-z0-9Α-ω∞]/.test(expression) || !/[=^_{}()[\]|<>+*/%Α-ω∞∫Σ√±≤≥≠≈∝→×·∗−′″⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻ᵗⁿᵢ₀-₉]/.test(expression)) return candidate;
      // Unmatched punctuation belongs to surrounding prose, not an expression.
      for (const [open, close] of [["(", ")"], ["[", "]"], ["{", "}"]]) {
        if (expression.split(open).length !== expression.split(close).length) return candidate;
      }
      return `$${legacyLatex(expression)}$${suffix}`;
    });
  }).join("");
}
