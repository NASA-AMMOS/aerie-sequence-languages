import { indentService, LanguageSupport } from '@codemirror/language';
import { EditorView } from 'codemirror';
import { debounce } from 'lodash-es';
import type { PhoenixContext, PhoenixResources } from '../../interfaces/phoenix.js';
import type { InputLanguage } from '../../interfaces/language.js';
import { seqnLRLanguage } from './seq-n.js';
import { seqNBlockHighlighter, seqNHighlightBlock } from './seq-n-highlighter.js';
import { SeqNCommandInfoMapper, seqnToLibrarySequence } from './seq-n-tree-utils.js';
import { seqnAutoIndent } from './seq-n-autoindent.js';
import { seqNFormat } from './seq-n-format.js';
import { seqnCompletion } from './seq-n-completion.js';
import { seqnLinter } from './seq-n-linter.js';
import { seqnTooltip } from './seq-n-tooltip.js';
import { linter } from '@codemirror/lint';
import { GlobalVariable } from 'types/global-types.js';

const debouncedSeqNHighlightBlock = debounce(seqNHighlightBlock, 250);

/**
 * Get keyed object for SeqN editor extensions to more easily replace/extend components.
 */
export function getSeqnExtensions(resources: PhoenixResources, context: PhoenixContext, globals?: GlobalVariable[]) {
  return {
    languageSupport: new LanguageSupport(seqnLRLanguage, [
      seqnLRLanguage.data.of({
        autocomplete: seqnCompletion(
          context.channelDictionary,
          context.commandDictionary,
          context.parameterDictionaries,
          context.librarySequences,
          globals,
        ),
      }),
    ]),
    linter: linter(view =>
      seqnLinter(
        view,
        context.channelDictionary,
        context.commandDictionary,
        context.parameterDictionaries,
        context.librarySequences,
        globals,
      ),
    ),
    tooltip: seqnTooltip(context.commandDictionary, resources),
    indent: indentService.of(seqnAutoIndent()),
    highlight: [EditorView.updateListener.of(debouncedSeqNHighlightBlock), seqNBlockHighlighter],
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
