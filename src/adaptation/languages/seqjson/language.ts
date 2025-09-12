import { BaseLanguage, OutputLanguage } from 'adaptation/interfaces/new-adaptation-interface.js';
import { outputLinter } from './output-linter.js';
import { seqnToSeqJson } from '../../../converters/seqnToSeqJson.js';
import { SeqLanguage } from '../seq-n/seq-n.js';
import { seqJsonToSeqn } from '../../../converters/seqJsonToSeqn.js';

export const seqJsonAdaptation: BaseLanguage = {
  name: 'SeqJSON',
  fileExtension: '.seq.json',
  editorExtension: context => [outputLinter(context.commandDictionary)],
};

export const seqJsonOutputLanguage: OutputLanguage = {
  ...seqJsonAdaptation,
  toOutputFormat(input, context, name) {
    return JSON.stringify(
      seqnToSeqJson(SeqLanguage.parser.parse(input), input, context.commandDictionary, name),
      null,
      2,
    );
  },
  toInputFormat(output, context, name) {
    return seqJsonToSeqn(JSON.parse(output));
  },
};
