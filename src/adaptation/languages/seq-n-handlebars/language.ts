import { indentService } from '@codemirror/language';
import { EditorView } from 'codemirror';
import { debounce } from 'lodash-es';
import type { PhoenixResources } from '../../interfaces/phoenix.js';
import { globals } from '../seq-n/global-types.js';
import type { InputLanguage } from '../../interfaces/language.js';
import { seqNBlockHighlighter, seqNHighlightBlock } from '../seq-n/seq-n-highlighter.js';
import { SeqNCommandInfoMapper, userSequenceToLibrarySequence } from '../seq-n/seq-n-tree-utils.js';
import { seqNFormat, sequenceAutoIndent } from '../seq-n/sequence-autoindent.js';
import { sequenceCompletion } from '../seq-n/sequence-completion.js';
import { seqnLinter } from '../seq-n/sequence-linter.js';
import { sequenceTooltip } from '../seq-n/sequence-tooltip.js';
import { setupLanguageSupport } from './seq-n-handlebars.js';

const debouncedSeqNHighlightBlock = debounce(seqNHighlightBlock, 250);

export function getSeqnHandlebarsLanguage(resources: PhoenixResources): InputLanguage {
  return {
    name: 'SeqN (Template)',
    fileExtension: '.template.seqN.txt',
    editorExtension: context => [
      setupLanguageSupport(
        sequenceCompletion(
          context.channelDictionary,
          context.commandDictionary,
          context.parameterDictionaries,
          Object.values(context.librarySequences),
        ),
      ),
      seqnLinter(
        globals,
        context.channelDictionary,
        context.commandDictionary,
        context.parameterDictionaries,
        Object.values(context.librarySequences),
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
