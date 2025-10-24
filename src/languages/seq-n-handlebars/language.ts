import { completeFromList } from '@codemirror/autocomplete';
import { LanguageSupport } from '@codemirror/language';
import type { PhoenixContext, PhoenixResources } from '../../interfaces/phoenix.js';
import type { InputLanguage } from '../../interfaces/language.js';
import { SeqNCommandInfoMapper, seqnToLibrarySequence } from '../seq-n/seq-n-tree-utils.js';
import { seqNFormat } from '../seq-n/seq-n-format.js';
import { seqnCompletion } from '../seq-n/seq-n-completion.js';
import { getHandlebarsOverSeqLanguage } from './seq-n-handlebars.js';
import { getSeqnExtensions } from 'languages/seq-n/language.js';
import { getSeqnLRLanguage } from 'languages/seq-n/seq-n.js';
import { getHandlebarsLanguage } from 'languages/handlebars/handlebars.js';
import { GlobalVariable } from 'types/global-types.js';

const handlebarsCompletions = [
  // Helpers
  'add-time',
  'subtract-time',
  'flatten',
  'formatAsDate',
  // Args
  'startTime',
];

/**
 * Editor extensions for SeqN with handlebars is the same as SeqN but with modified language definition/completions
 */
function getSeqnHandlebarsExtensions(
  resources: PhoenixResources,
  context: PhoenixContext,
  globals?: GlobalVariable[],
  mapper?: SeqNCommandInfoMapper,
) {
  globals = globals ?? [];
  mapper = mapper ?? new SeqNCommandInfoMapper(globals);
  const handlebarsLanguage = getHandlebarsLanguage(resources);
  const extensions = getSeqnExtensions(resources, context, globals, mapper);
  const seqnLRLanguage = getSeqnLRLanguage(resources);
  const handlebarsOverSeqLanguage = getHandlebarsOverSeqLanguage(resources);
  extensions.languageSupport = new LanguageSupport(handlebarsOverSeqLanguage, [
    seqnLRLanguage.data.of({
      autocomplete: seqnCompletion(context, globals, mapper),
    }),
    handlebarsLanguage.extension,
    handlebarsOverSeqLanguage.data.of({ autocomplete: completeFromList(handlebarsCompletions) }),
  ]);
  return extensions;
}

export const seqnHandlebarsLanguage: InputLanguage = {
  name: 'SeqN (Template)',
  fileExtension: '.template.seqN.txt',
  getEditorExtension: (context, resources) => Object.values(getSeqnHandlebarsExtensions(resources, context)),
  commandInfoMapper: new SeqNCommandInfoMapper(),
  format: seqNFormat,
  getLibrarySequences: sequence => [seqnToLibrarySequence(sequence)],
};
