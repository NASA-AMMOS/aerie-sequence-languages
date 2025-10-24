import { BaseLanguage } from 'interfaces/language.js';
import { outputLinter } from './output-linter.js';

export const seqJsonLanguage: BaseLanguage = {
  name: 'Seq JSON',
  fileExtension: '.seq.json',
  getEditorExtension: (context, resources) => [outputLinter(resources, context.commandDictionary)],
};
