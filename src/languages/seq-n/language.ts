import { LanguageSupport } from '@codemirror/language';
import { ViewPlugin } from "@codemirror/view";
import { debounce } from 'lodash-es';
import type { InputLanguage } from '../../interfaces/language.js';
import type { PhoenixContext, PhoenixResources } from '../../interfaces/phoenix.js';
import { GlobalVariable } from '../../types/global-types.js';
import { seqnAutoIndent } from './seq-n-autoindent.js';
import { seqnCompletion } from './seq-n-completion.js';
import { seqNFormat } from './seq-n-format.js';
import { seqNBlockHighlighter, seqNHighlightBlock } from './seq-n-highlighter.js';
import { seqnLinter } from './seq-n-linter.js';
import { seqnTooltip } from './seq-n-tooltip.js';
import { SeqNCommandInfoMapper, seqnToLibrarySequence } from './seq-n-tree-utils.js';
import { getSeqnLRLanguage } from './seq-n.js';
import type { Extension } from "@codemirror/state";
import { Transaction } from "@codemirror/state";

const debouncedSeqNHighlightBlock = debounce(seqNHighlightBlock, 250);


const sanitizeSmartQuotes = (s: string) =>
  s.replace(/[\u201C\u201D]/g, '"').replace(/[\u2018\u2019]/g, "'");

export const sanitizeSeqN = ViewPlugin.fromClass(class {
  constructor(view: any) {
    const text = view.state.doc.toString();
    const cleanText = sanitizeSmartQuotes(text);
    if (cleanText !== text) {
      setTimeout(() => {
        console.warn("Sanitized document, replaced curly quotes with standard ASCII quotes");
        view.dispatch({
          changes: { from: 0, to: view.state.doc.length, insert: cleanText },
          annotations: Transaction.userEvent.of("sanitize.smartQuotes")
        });
      }, 0);
    }
  }
});

/**
 * Get keyed object for SeqN editor extensions to more easily replace/extend components.
 */
export function getSeqnExtensions(
  resources: PhoenixResources,
  context: PhoenixContext,
  globals?: GlobalVariable[],
  mapper?: SeqNCommandInfoMapper,
): {[key: string]: Extension} {
  globals = globals ?? [];
  mapper = mapper ?? new SeqNCommandInfoMapper();
  const seqnLRLanguage = getSeqnLRLanguage(resources);
  return {
    languageSupport: new LanguageSupport(seqnLRLanguage, [
      seqnLRLanguage.data.of({
        autocomplete: seqnCompletion(context, globals, mapper),
      }),
    ]),
    linter: resources.linter(view => seqnLinter(view, context, globals, mapper)),
    tooltip: seqnTooltip(context.commandDictionary, resources, context, mapper),
    indent: resources.indentService.of(seqnAutoIndent()),
    highlight: [resources.EditorView.updateListener.of(debouncedSeqNHighlightBlock), seqNBlockHighlighter(resources)],
    sanitize: sanitizeSeqN
  };
}

export const seqnLanguage: InputLanguage = {
  name: 'SeqN',
  fileExtension: '.seqN.txt',
  getEditorExtension: (context, resources) => Object.values(getSeqnExtensions(resources, context)),
  commandInfoMapper: new SeqNCommandInfoMapper(),
  format: seqNFormat,
  getLibrarySequences: sequence => [seqnToLibrarySequence(sequence)],
};
