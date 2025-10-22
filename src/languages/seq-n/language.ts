import { LanguageSupport } from '@codemirror/language';
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

const debouncedSeqNHighlightBlock = debounce(seqNHighlightBlock, 250);

/**
 * Get keyed object for SeqN editor extensions to more easily replace/extend components.
 */
export function getSeqnExtensions(
  resources: PhoenixResources,
  context: PhoenixContext,
  globals?: GlobalVariable[],
  mapper?: SeqNCommandInfoMapper,
) {
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
  };
}

export function getSeqnLanguage(resources: PhoenixResources): InputLanguage {
  return {
    name: 'SeqN',
    fileExtension: '.seqN.txt',
    editorExtension: (context: PhoenixContext) => Object.values(getSeqnExtensions(resources, context)),
    commandInfoMapper: new SeqNCommandInfoMapper(),
    format: seqNFormat,
    getLibrarySequences: sequence => [seqnToLibrarySequence(sequence)],
  };
}
