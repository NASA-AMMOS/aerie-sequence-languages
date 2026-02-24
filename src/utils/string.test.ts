import {
  escapeControlCharsInJsonStringLiterals,
  isQuoted,
  pluralize,
  quoteEscape,
  removeEscapedQuotes,
  safeParseJsonString,
  unquoteUnescape,
} from './string.js';
import { describe, expect, it } from 'vitest';

describe(`'Escaped quotes' from input`, () => {
  it('Should remove escaped quotes surrounding a string', () => {
    const input = `\\"Hello, World!\\"`;
    const expected = '"Hello, World!"';

    expect(removeEscapedQuotes(input)).toBe(expected);
  });

  it('Should remove escaped quotes within a string', () => {
    const input = `The world is \\"Hello, World!\\"`;
    const expected = 'The world is "Hello, World!"';

    expect(removeEscapedQuotes(input)).toBe(expected);
  });

  it('should not modify a string without escaped quotes', () => {
    const input = 'Hello, World!';
    const expected = 'Hello, World!';
    expect(removeEscapedQuotes(input)).toBe(expected);
  });

  it('should return a number unchanged', () => {
    const input = 123;
    expect(removeEscapedQuotes(input)).toBe(input);
  });

  it('should return a boolean unchanged', () => {
    const input = true;
    expect(removeEscapedQuotes(input)).toBe(input);
  });
});

describe('quoteEscape', () => {
  it('should escape double quotes with a backslash', () => {
    expect(quoteEscape('"')).toBe(`"\\""`);
  });

  it('should escape multiple double quotes with multiple backslashes', () => {
    expect(quoteEscape('""')).toBe(`"\\"\\""`);
  });

  it('should not escape non-double quotes', () => {
    expect(quoteEscape('abc')).toBe(`"abc"`);
  });

  it('should escape double quotes within a string', () => {
    expect(quoteEscape('hello "world"')).toBe(`"hello \\"world\\""`);
  });

  describe('isQuoted', () => {
    it('should return true for a string surrounded by double quotes', () => {
      expect(isQuoted('"hello"')).toBe(true);
    });

    it('should return false for a string not surrounded by double quotes', () => {
      expect(isQuoted('hello')).toBe(false);
    });

    it('should return false for a string with only one double quote', () => {
      expect(isQuoted('"hello')).toBe(false);
      expect(isQuoted('hello"')).toBe(false);
    });
  });

  describe('unquoteUnescape', () => {
    it('should remove double quotes and unescape double quotes from a string surrounded by double quotes', () => {
      expect(unquoteUnescape('"hello \\"world\\""')).toBe('hello "world"');
    });

    it('should return the input string if it is not surrounded by double quotes', () => {
      expect(unquoteUnescape('hello')).toBe('hello');
    });

    it('should return the input string if it is only one double quote', () => {
      expect(unquoteUnescape('"')).toBe('"');
      expect(unquoteUnescape('""')).toBe('');
      expect(unquoteUnescape('"hello')).toBe('"hello');
      expect(unquoteUnescape('hello"')).toBe('hello"');
    });
  });

  it('pluralize', () => {
    expect(pluralize(0)).toBe('s');
    expect(pluralize(1)).toBe('');
    expect(pluralize(10)).toBe('s');
  });
});

describe('escapeControlCharsInJsonStringLiterals', () => {
  it('leaves pretty-printed whitespace outside strings unchanged', () => {
    const input = '{\n\t"thing": "OK"\n}\n';
    const out = escapeControlCharsInJsonStringLiterals(input);
    expect(out).toBe(input);
  });

  it('escapes literal tabs/newlines inside a string value', () => {
    const input = '{"a":"x\ty"}';
    const out = escapeControlCharsInJsonStringLiterals(input);
    expect(out).toBe('{"a":"x\\ty"}'); // literal tab becomes two chars: \ and t
  });

  it('escapes other control chars to unicode form', () => {
    const input = `{"a":"x${String.fromCharCode(0x01)}y"}`;
    const out = escapeControlCharsInJsonStringLiterals(input);
    expect(out).toBe('{"a":"x\\u0001y"}');
  });

  it('does not double-escape already-escaped sequences', () => {
    const input = '{"a":"x\\ty"}'; // characters: x \ t y
    const out = escapeControlCharsInJsonStringLiterals(input);
    expect(out).toBe(input);
  });

  it('does not get confused by escaped quotes', () => {
    const input = '{"a":"he said: \\"yo\\"","b":"ok"}';
    const out = escapeControlCharsInJsonStringLiterals(input);
    expect(out).toBe(input);
  });

  it('repairs control chars in keys too', () => {
    const input = `{"a\tb": 1}`;
    const out = escapeControlCharsInJsonStringLiterals(input);
    expect(out).toBe('{"a\\tb": 1}');
  });

  it('handles nested objects/arrays and only escapes inside string literals', () => {
    const input =
      '{\n' + '\t"arr": ["ok", "x\ty", {"k": "m\nn"}],\n' + '\t"obj": {"inner": ["a", "b", "c\rd"]}\n' + '}\n';

    const out = escapeControlCharsInJsonStringLiterals(input);

    const expected =
      '{\n' + '\t"arr": ["ok", "x\\ty", {"k": "m\\nn"}],\n' + '\t"obj": {"inner": ["a", "b", "c\\rd"]}\n' + '}\n';

    expect(out).toBe(expected);
  });
});

describe('safeParseJsonString', () => {
  it('parses normal json unchanged', () => {
    expect(safeParseJsonString('{"a":1,"b":"ok"}')).toEqual({ a: 1, b: 'ok' });
  });

  it('parses and repairs values containing literal control chars', () => {
    expect(safeParseJsonString('{"a":"x\ty","b":"m\nn","c":"p\rr"}')).toEqual({
      a: 'x\ty',
      b: 'm\nn',
      c: 'p\rr',
    });
  });

  it('throws if json is still invalid after escaping', () => {
    expect(() => safeParseJsonString('{"a": "ok", }')).toThrow();
  });
});

