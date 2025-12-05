import { parser } from './stol.grammar.js';
import { PhoenixResources } from 'interfaces/phoenix.js';
import { delimitedIndent, indentNodeProp } from '@codemirror/language';
import { styleTags, tags as t } from '@lezer/highlight';


export const STOLParser = parser;

// TODO: Parse mixed w. Handlebars

export function getSTOLLRLanguage(resources: PhoenixResources) {
  return resources.LRLanguage.define({
    languageData: {
      commentTokens: { line: '#' },
    },
    parser: parser.configure({
      props: [
        indentNodeProp.add({
          Application: delimitedIndent({ align: false, closing: ')' }),
        }),
        styleTags({
          Boolean: t.bool,
          Wait: t.namespace,
          WaitUntil: t.namespace,
          TimeOffset: t.namespace,
          Number: t.number,
          DateTime: t.className,
          CommandName: t.keyword,
          CommandArgs: t.attributeValue,
          LineComment: t.comment
        }),
      ],
    })
  });
}
