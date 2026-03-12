import { describe, expect, it } from 'vitest';
import { sanitizeSmartQuotes } from './language';

describe('sanitizeSmartQuotes', () => {
  it('should replace curly quotes with ASCII quotes & leave all other text alone', () => {
    const unchanged = 'hello';
    const withQuotes = 'this has “curly double quotes” and ‘curly single quotes’';
    expect(sanitizeSmartQuotes(unchanged)).toEqual(unchanged);
    expect(sanitizeSmartQuotes(withQuotes)).toEqual('this has "curly double quotes" and \'curly single quotes\'');
  });
});
