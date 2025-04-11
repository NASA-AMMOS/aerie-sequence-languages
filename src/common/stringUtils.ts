/**
 * Checks if a string is enclosed in double quotes.
 *
 * @param {string} s - The string to check.
 * @returns {boolean} True if the string starts and ends with double quotes, false otherwise.
 *
 * @example
 * isQuoted('"hello"'); // returns true
 * isQuoted('hello');   // returns false
 */
export function isQuoted(s: string) {
  return s.startsWith('"') && s.endsWith('"');
}

/**
 * Removes the surrounding double quotes from a string and replaces escaped quotes
 * (`\"`) with regular double quotes.
 *
 * @param {string} s - The string to process.
 * @returns {string} The unquoted and unescaped string.  If the input string is not
 * quoted, it is returned unchanged.
 *
 * @example
 * unquoteUnescape('"hello"');     // returns 'hello'
 * unquoteUnescape('"hello\\\"world\\\""'); // returns 'hello"world"'
 * unquoteUnescape('hello');       // returns 'hello'
 */
export function unquoteUnescape(s: string) {
  if (isQuoted(s) && s.length > 1) {
    return s.slice(1, -1).replaceAll('\\"', '"');
  }
  return s;
}

export function removeQuote(s: string) {
  if (isQuoted(s) && s.length > 1) {
    return s.trim().slice(1, -1);
  }
  return s;
}

/**
 * Encloses a string in double quotes and escapes any existing double quotes
 * within the string by preceding them with a backslash.
 *
 * @param {string} s - The string to quote and escape.
 * @returns {string} The quoted and escaped string.
 *
 * @example
 * quoteEscape('hello');       // returns '"hello"'
 * quoteEscape('hello"world"'); // returns '"hello\"world\""'
 */
export function quoteEscape(s: string) {
  return `"${s.replaceAll('"', '\\"')}"`;
}
