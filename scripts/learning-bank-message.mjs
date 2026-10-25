// Authored question text is literal content, never an ICU parameter template.
export function learningBankMessage(text) {
  const escaped = text.replaceAll("'", "''");
  const firstBrace = escaped.search(/[{}]/u);
  if (firstBrace === -1) return escaped;
  const lastBrace = Math.max(escaped.lastIndexOf("{"), escaped.lastIndexOf("}"));
  // Quote the entire brace span so nested or adjacent braces cannot turn
  // neighboring ICU quotes into a literal apostrophe.
  return `${escaped.slice(0, firstBrace)}'${escaped.slice(firstBrace, lastBrace + 1)}'${escaped.slice(lastBrace + 1)}`;
}
