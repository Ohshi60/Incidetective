// Text helpers shared by the API and the web app.

const HEADLINE_CHARS = 160;

/**
 * A pattern short enough to quote in a sentence. Patterns from Java-style
 * logs include the whole stack trace; keep the start, cut at a word.
 */
export function headline(pattern: string, max = HEADLINE_CHARS): string {
  const text = pattern.replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max / 2 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}
