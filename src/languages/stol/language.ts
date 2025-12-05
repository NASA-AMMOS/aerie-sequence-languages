import { InputLanguage } from "interfaces/language";
import { PhoenixContext, PhoenixResources } from "interfaces/phoenix";
import { GlobalVariable } from "types/global-types";
import { STOLCommandInfoMapper } from "./stol-tree-utils";
import { LanguageSupport } from "@codemirror/language";
import { getSTOLLRLanguage } from "./stol";
import { stolCompletion } from "./stol-completion";
import { stolLinter } from "./stol-linter";
import { stolAutoIndent } from "./stol-autoindent";

export function getSTOLExtensions(
  resources: PhoenixResources,
  context: PhoenixContext,
  globals?: GlobalVariable[],
  mapper?: STOLCommandInfoMapper,
) {
  globals = globals ?? [];
  mapper = mapper ?? new STOLCommandInfoMapper();
  const seqnLRLanguage = getSTOLLRLanguage(resources);
  return {
    languageSupport: new LanguageSupport(seqnLRLanguage, [
      seqnLRLanguage.data.of({
        autocomplete: stolCompletion(context, globals, mapper),
      }),
    ]),
    linter: resources.linter(view => stolLinter(view, context, globals, mapper)),
    indent: resources.indentService.of(stolAutoIndent()),
  };
}


export const stolLanguage: InputLanguage = {
  name: "STOL",
  fileExtension: ".stol",
  getEditorExtension: (context, resources) => Object.values(getSTOLExtensions(resources, context)),
  commandInfoMapper: new STOLCommandInfoMapper()
}
