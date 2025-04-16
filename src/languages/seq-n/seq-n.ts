import { LRLanguage } from '@codemirror/language';
import { parser } from './seq-n.grammar.js';

export const SeqLanguage = LRLanguage.define({
  languageData: {
    commentTokens: { line: '#' },
  },
  parser,
});
