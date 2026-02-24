import {describe, expect, it, test} from 'vitest';
import {sanitizeSmartQuotes} from "./language";
import {satfToSeqn} from "../../converters/satf-sasf-utils";

describe('sanitizeSmartQuotes', () => {
  it('should replace curly quotes with ASCII quotes & leave all other text alone', async () => {
    const unchanged = 'hello';
    const withQuotes = 'this has “curly double quotes” and ‘curly single quotes’';
    expect(sanitizeSmartQuotes(unchanged)).toEqual(unchanged);
    expect(sanitizeSmartQuotes(withQuotes)).toEqual(
      'this has "curly double quotes" and \'curly single quotes\''
    );
  });
});
