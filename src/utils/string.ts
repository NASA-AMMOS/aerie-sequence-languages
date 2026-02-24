export function isQuoted(s: string): boolean {
  return s.startsWith('"') && s.endsWith('"');
}

export function unquoteUnescape(s: string): string {
  if (isQuoted(s) && s.length > 1) {
    return s.slice(1, -1).replaceAll('\\"', '"');
  }
  return s;
}

export function quoteEscape(s: string): string {
  return `"${s.replaceAll('"', '\\"')}"`;
}

export function removeQuote(s: string) {
  if (isQuoted(s) && s.length > 1) {
    return s.trim().slice(1, -1);
  }
  return s;
}

export function pluralize(count: number): string {
  return count === 1 ? '' : 's';
}

export function removeEscapedQuotes(text: string): string;
export function removeEscapedQuotes(text: number): number;
export function removeEscapedQuotes(text: boolean): boolean;
export function removeEscapedQuotes(text: string | number | boolean): string | number | boolean {
  if (typeof text === 'string') {
    return text.replace(/\\"|"(?!\\")/g, '"').trim();
  }
  return text;
}

/**
 * Safely parse a JSON string by escaping raw control characters (U+0000 to U+001F)
 * within string literals (keys or values) before passing to JSON.parse. This handles
 * cases where strings contain unescaped control characters like tab or newline,
 * that would otherwise cause JSON.parse to throw.
 *
 * Common chars (\t, \n, \r) escaped to readable forms, others escaped to \uXXXX unicode format.
 *
 * @param jsonText - A JSON string '"like this"' or '{"like": "this"}' to be parsed
 * @returns The parsed JSON value
 * @throws {SyntaxError} If the string is not valid JSON after escaping
 */
export function safeParseJsonString(jsonText: string): unknown {
  return JSON.parse(escapeControlCharsInJsonStringLiterals(jsonText));
}

// regex to find string literals (things in quotes, keys or values) in a JSON string
const JSON_STRING_RE = /"(?:\\.|[^"\\])*"/g;
// regex to find all control characers in a string
const CONTROL_CHAR_RE = /[\u0000-\u001f]/g;
// map of common control characters to their readable escaped versions
const CONTROL_CHAR_MAP: Record<string, string> = {
  '\t': '\\t',
  '\n': '\\n',
  '\r': '\\r',
};

export function escapeControlCharsInJsonStringLiterals(jsonText: string): string {
  // given a string of JSON text '"like this"' or '{"like": "this"}'
  // look for control characters *inside string literals ONLY* and replace them with escaped characters
  return jsonText.replace(JSON_STRING_RE, strLit =>
    strLit.replace(CONTROL_CHAR_RE, c => {
      return CONTROL_CHAR_MAP[c] ?? `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`;
    }),
  );
}
