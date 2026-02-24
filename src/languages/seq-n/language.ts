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
import type { Extension, SelectionRange } from "@codemirror/state";
import { Transaction, EditorSelection } from "@codemirror/state";

const debouncedSeqNHighlightBlock = debounce(seqNHighlightBlock, 250);

export const sanitizeSmartQuotes = (s: string) =>
  s.replace(/[\u201C\u201D]/g, '"').replace(/[\u2018\u2019]/g, "'");

export const sanitizeTextExtension = ViewPlugin.fromClass(class {
  // CodeMirror extension that sanitizes text when doc is opened or when text is pasted
  // replaces curly quotes with ASCII quotes
  constructor(view: any) {
    this.sanitizeDocument(view);
  }

  update(update: any) {
    if (!update.docChanged) return;

    const openedOrPasted = update.transactions.some(
      (t: any) => t.annotation(Transaction.userEvent) === "file.open" || t.annotation(Transaction.userEvent) === "input.paste"
    );
    if (!openedOrPasted) return;

    this.sanitizeDocument(update.view);
  }

  sanitizeDocument(view: any) {
    const text = view.state.doc.toString();
    const clean = sanitizeSmartQuotes(text);
    if (clean === text) return;

    setTimeout(() => {
      const oldSel = view.state.selection;
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: clean },
        annotations: [Transaction.userEvent.of("sanitize.smartQuotes")],
        selection: EditorSelection.create(
          oldSel.ranges.map((r: SelectionRange) => EditorSelection.range(r.from, r.to))
        ),
      });
    }, 0);

    console.warn(`sanitized doc, replaced curly quotes`);
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
    sanitize: sanitizeTextExtension
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
