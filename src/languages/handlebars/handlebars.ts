import { foldInside, foldNodeProp, indentNodeProp } from '@codemirror/language';
import { parser } from './handlebars.grammar.js';
import { PhoenixResources } from 'interfaces/phoenix.js';

const mixedParser = parser.configure({
  props: [
    // Add basic folding/indent metadata
    foldNodeProp.add({ Conditional: foldInside }),
    indentNodeProp.add({
      Conditional: cx => {
        const closed = /^\s*\{% endif/.test(cx.textAfter);
        return cx.lineIndent(cx.node.from) + (closed ? 0 : cx.unit);
      },
    }),
  ],
});

export function getHandlebarsLanguage(resources: PhoenixResources) {
  return resources.LRLanguage.define({ parser: mixedParser });
}
