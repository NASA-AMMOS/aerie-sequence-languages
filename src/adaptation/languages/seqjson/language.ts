import { OutputLanguageAdaptation } from 'adaptation/interfaces/new-adaptation-interface.js';
import { outputLinter } from './output-linter.js';
import { seqnToSeqJson } from '../../../converters/seqnToSeqJson.js';
import { SeqLanguage } from '../seq-n/seq-n.js';
import { seqJsonToSeqn } from '../../../converters/seqJsonToSeqn.js';

export const seqJsonOutputAdaptation: OutputLanguageAdaptation = {
  // TODO make CommandInfoMapper optional s.t. we can export a `LanguageAdaptation` and have the consumer decide on conversions
  name: 'SeqJSON',
  fileExtension: '.seq.json',
  editorExtension: context => [outputLinter(context.commandDictionary)],
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
