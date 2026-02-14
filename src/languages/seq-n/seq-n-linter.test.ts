import { describe, expect, it } from 'vitest';
import { lintBadStringEscapes } from './seq-n-linter.js';

describe('lintBadStringEscapes', () => {
  it.each([
    // valid escape chars
    { s: `"\\t"`, exp: [] },
    { s: `"\\n"`, exp: [] },
    { s: `"\\r"`, exp: [] },
    { s: `"\\\""`, exp: [] },
    { s: `"\\\\ "`, exp: [] },
    { s: `"\\u1234"`, exp: [] },
    { s: `"\\x0F"`, exp: [] },

    // invalid escape chars
    { s: `"\\a"`, exp: [{ from: 1, to: 3, tok: '\\a' }] },
    { s: `"hi \\q"`, exp: [{ from: 4, to: 6, tok: '\\q' }] },
    { s: `"\\\\\\ "`, exp: [{ from: 3, to: 5, tok: '\\ ' }] },
    { s: `"bad \\uX"`, exp: [{ from: 5, to: 7, tok: '\\u' }] },
    { s: `"\\xG1"`, exp: [{ from: 1, to: 3, tok: '\\x' }] },
  ])('case: $s', ({ s, exp }) => {
    const diags = lintBadStringEscapes(s, 0);

    expect(diags.length).toBe(exp.length);

    diags.forEach((d, i) => {
      const relFrom = d.from;
      const relTo = d.to;
      const tok = d.message.match(/'([^']+)'/)?.[1];

      expect({ from: relFrom, to: relTo, tok }).toEqual(exp[i]);
    });
  });

  it('respects baseArgFrom offsets', () => {
    const base = 50;
    const diags = lintBadStringEscapes(`"ok \\a"`, base);

    expect(diags).toHaveLength(1);
    expect(diags[0].from).toBe(base + 4);
    expect(diags[0].to).toBe(base + 6);
  });
});
