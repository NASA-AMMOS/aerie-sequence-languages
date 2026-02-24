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
 * Safely parses a JSON string by escaping raw control characters (U+0000 to U+001F)
 * before passing to JSON.parse. This handles cases where input contains unescaped
 * control characters that would otherwise cause JSON.parse to throw.
 *
 * Common control characters (\t, \n, \r) are escaped to their readable forms,
 * while other control characters are escaped to \uXXXX unicode format.
 *
 * @param s - A JSON string that may contain raw control characters
 * @returns The parsed JSON value
 * @throws {SyntaxError} If the string is not valid JSON after escaping
 */
export function safeParseJsonString(s: string): unknown {
  const controlCharMap: Record<string, string> = { '\t': '\\t', '\n': '\\n', '\r': '\\r' };
  // eslint-disable-next-line no-control-regex
  const escaped = s.replace(/[\u0000-\u001f]/g, c => {
    return controlCharMap[c] ?? `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`;
  });
  return JSON.parse(escaped);
}
