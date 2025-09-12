import { indentService } from '@codemirror/language';
import { EditorView } from 'codemirror';
import { debounce } from 'lodash-es';
import type { PhoenixResources } from '../../interfaces/phoenix.js';
import type { InputLanguage } from '../../interfaces/language.js';
import { globals } from './global-types.js';
import { setupLanguageSupport } from './seq-n.js';
import { seqNBlockHighlighter, seqNHighlightBlock } from './seq-n-highlighter.js';
import { SeqNCommandInfoMapper, userSequenceToLibrarySequence } from './seq-n-tree-utils.js';
import { seqNFormat, sequenceAutoIndent } from './sequence-autoindent.js';
import { sequenceCompletion } from './sequence-completion.js';
import { seqnLinter } from './sequence-linter.js';
import { sequenceTooltip } from './sequence-tooltip.js';

const debouncedSeqNHighlightBlock = debounce(seqNHighlightBlock, 250);

export function getSeqnLanguage(resources: PhoenixResources): InputLanguage {
  return {
    name: 'SeqN',
    fileExtension: '.seqN.txt',
    editorExtension: context => [
      setupLanguageSupport(
        sequenceCompletion(
          context.channelDictionary,
          context.commandDictionary,
          context.parameterDictionaries,
          context.librarySequences,
        ),
      ),
      seqnLinter(
        globals,
        context.channelDictionary,
        context.commandDictionary,
        context.parameterDictionaries,
        context.librarySequences,
      ),
      sequenceTooltip(context.commandDictionary, resources),
      indentService.of(sequenceAutoIndent()),
      [EditorView.updateListener.of(debouncedSeqNHighlightBlock), seqNBlockHighlighter],
    ],
    commandInfoMapper: new SeqNCommandInfoMapper(),
    format: seqNFormat,
    getLibrarySequences: sequence => [userSequenceToLibrarySequence(sequence)],
  };
}
