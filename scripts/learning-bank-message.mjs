// Authored question text is literal content, never an ICU parameter template.
export function learningBankMessage(text) {
  const escaped = text.replaceAll("'", "''");
  const firstBrace = escaped.search(/[{}<]/u);
  if (firstBrace === -1) return escaped;
  const lastBrace = Math.max(...["{", "}", "<", ">"].map((character) => escaped.lastIndexOf(character)));
  // Quote the entire syntax span: adjacent quotes must not become apostrophes,
  // and inequalities such as 0<k<K must not become rich-text tags.
  return `${escaped.slice(0, firstBrace)}'${escaped.slice(firstBrace, lastBrace + 1)}'${escaped.slice(lastBrace + 1)}`;
}
