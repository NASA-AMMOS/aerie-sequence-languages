import { BaseLanguage } from 'interfaces/language.js';
import { outputLinter } from './output-linter.js';

export const seqJsonLanguage: BaseLanguage = {
  name: 'SeqJSON',
  fileExtension: '.seq.json',
  editorExtension: context => [outputLinter(context.commandDictionary)],
};

// TODO move this to Clipper land
// export const seqJsonOutputLanguage: OutputLanguage = {
//   ...seqJsonLanguage,
//   toOutputFormat(input, context, name) {
//     return JSON.stringify(
//       seqnToSeqJson(seqnLanguage.parser.parse(input), input, context.commandDictionary, name),
//       null,
//       2,
//     );
//   },
//   toInputFormat(output, context, name) {
//     return seqJsonToSeqn(JSON.parse(output));
//   },
// };
