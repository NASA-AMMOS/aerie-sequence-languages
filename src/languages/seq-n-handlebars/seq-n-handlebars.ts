import { parseMixed } from '@lezer/common';
import { getHandlebarsLanguage } from '../handlebars/handlebars.js';
import { seqnParser } from '../seq-n/seq-n.js';
import { PhoenixResources } from 'interfaces/phoenix.js';

export function getHandlebarsOverSeqLanguage(resources: PhoenixResources) {
  const handlebarsLanguage = getHandlebarsLanguage(resources);
  return resources.LRLanguage.define({
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
}
