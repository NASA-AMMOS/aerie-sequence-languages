import { LRLanguage } from '@codemirror/language';
import { parseMixed } from '@lezer/common';
import { handlebarsLanguage } from '../handlebars/handlebars.js';
import { seqnParser } from '../seq-n/seq-n.js';

export const HandlebarsOverSeqLanguage = LRLanguage.define({
  languageData: {
    commentTokens: { line: '#' },
  },
  parser: handlebarsLanguage.parser.configure({
    wrap: parseMixed(node => {
      return node.type.isTop
        ? {
            overlay: node => node.type.name === 'Text',
            parser: seqnParser, // TODO: We need to get the correct parser from the sequence adaptation somehow...
          }
        : null;
    }),
  }),
});
