import { BaseLanguage } from 'interfaces/language.js';
import { outputLinter } from './output-linter.js';

export const seqJsonLanguage: BaseLanguage = {
  name: 'SeqJSON',
  fileExtension: '.seq.json',
  getEditorExtension: (context, resources) => [outputLinter(resources, context.commandDictionary)],
};
