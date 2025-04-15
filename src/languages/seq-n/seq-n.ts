import { LRLanguage } from '@codemirror/language';
import { parser } from './seq-n.grammar';

export const SeqLanguage = LRLanguage.define({
  languageData: {
    commentTokens: { line: '#' },
  },
  parser,
});
