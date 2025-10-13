import { BaseLanguage } from 'interfaces/language.js';
import { outputLinter } from './output-linter.js';
import { PhoenixResources } from '../../interfaces/phoenix.js';

export function seqJsonLanguage(resources: PhoenixResources): BaseLanguage {
  return {
    name: 'SeqJSON',
    fileExtension: '.seq.json',
    editorExtension: context => [outputLinter(resources, context.commandDictionary)],
  };
}
