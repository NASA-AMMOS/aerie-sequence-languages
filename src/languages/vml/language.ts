import { debounce } from 'lodash-es';
import { InputLanguage } from '../../interfaces/language.js';
import type { PhoenixContext, PhoenixResources } from '../../interfaces/phoenix.js';
import { parseFunctionSignatures, vmlAutoComplete } from './vml-adaptation.js';
import { vmlFormat } from './vml-formatter.js';
import { vmlLinter } from './vml-linter.js';
import { vmlTooltip } from './vml-tooltip.js';
import { VmlCommandInfoMapper } from './vml-tree-utils.js';
import { setupVmlLanguageSupport, vmlBlockHighlighter, vmlHighlightBlock } from './vml.js';

const debouncedVmlHighlightBlock = debounce(vmlHighlightBlock, 250);

const getEditorExtension = (context: PhoenixContext, resources: PhoenixResources) => {
  const librarySequenceMap = Object.fromEntries(context.librarySequences.map(seq => [seq.name, seq]));
  return [
    setupVmlLanguageSupport(
      vmlAutoComplete(
        context.commandDictionary,
        [], // TODO: Globals?
        librarySequenceMap,
      ),
    ),
    resources.linter(view =>
      vmlLinter(
        view,
        context.commandDictionary,
        librarySequenceMap,
        [], // TODO: globals?
      ),
    ),
    vmlTooltip(context.commandDictionary, librarySequenceMap, resources),
    // indentService.of(adaptation.autoIndent()) // VML doesn't seem to have an indenter???
    [resources.EditorView.updateListener.of(debouncedVmlHighlightBlock), vmlBlockHighlighter],
  ];
};

export function getVmlLanguage(resources: PhoenixResources): InputLanguage {
  return {
    name: 'VML',
    fileExtension: '.vml',
    editorExtension: context => getEditorExtension(context, resources),
    commandInfoMapper: new VmlCommandInfoMapper(),
    format: vmlFormat,
    getLibrarySequences: sequence => parseFunctionSignatures(sequence.definition),
  };
}
