import { EditorView } from "codemirror";
import { debounce } from "lodash-es";
import type { LanguageAdaptation, NewAdaptationInterface } from "../../interfaces/new-adaptation-interface.js";
import { setupVmlLanguageSupport, vmlBlockHighlighter, vmlHighlightBlock } from "./vml.js";
import { parseFunctionSignatures, vmlAutoComplete } from "./vml-adaptation.js";
import { vmlFormat } from "./vml-formatter.js";
import { vmlLinter } from "./vml-linter.js";
import { vmlTooltip } from "./vml-tooltip.js";
import { VmlCommandInfoMapper } from "./vml-tree-utils.js";

const debouncedVmlHighlightBlock = debounce(vmlHighlightBlock, 250);

const vmlAdaptation: LanguageAdaptation = {
    name: "VML",
    fileExtension: ".vml",
    editorExtension: context => [
        setupVmlLanguageSupport(vmlAutoComplete(
            context.commandDictionary,
            [], // TODO: Globals?
            context.librarySequenceMap,
        )),
        vmlLinter(
            context.commandDictionary,
            context.librarySequenceMap,
            [], // TODO: globals?
        ),
        vmlTooltip(
            context.commandDictionary,
            context.librarySequenceMap,
        ),
        // indentService.of(adaptation.autoIndent()) // VML doesn't seem to have an indenter???
        [
          EditorView.updateListener.of(debouncedVmlHighlightBlock),
          vmlBlockHighlighter,
        ],
    ],
    commandInfoMapper: new VmlCommandInfoMapper(),
    format: vmlFormat,
    getLibrarySequences: sequence => parseFunctionSignatures(sequence.definition)
}

export const defaultAdaptation: NewAdaptationInterface = {
    input: vmlAdaptation,
    outputs: [],
}
