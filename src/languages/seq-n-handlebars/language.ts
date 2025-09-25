import { completeFromList } from '@codemirror/autocomplete';
import { LanguageSupport } from '@codemirror/language';
import type { PhoenixContext, PhoenixResources } from '../../interfaces/phoenix.js';
import type { InputLanguage } from '../../interfaces/language.js';
import { SeqNCommandInfoMapper, seqnToLibrarySequence } from '../seq-n/seq-n-tree-utils.js';
import { seqNFormat } from '../seq-n/seq-n-format.js';
import { seqnCompletion } from '../seq-n/seq-n-completion.js';
import { HandlebarsOverSeqLanguage } from './seq-n-handlebars.js';
import { getSeqnExtensions } from 'languages/seq-n/language.js';
import { seqnLRLanguage } from 'languages/seq-n/seq-n.js';
import { handlebarsLanguage } from 'languages/handlebars/handlebars.js';

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
function getSeqnHandlebarsExtensions(resources: PhoenixResources, context: PhoenixContext) {
  const extensions = getSeqnExtensions(resources, context);
  extensions.languageSupport = new LanguageSupport(HandlebarsOverSeqLanguage, [
    seqnLRLanguage.data.of({
      autocomplete: seqnCompletion(
        context.channelDictionary,
        context.commandDictionary,
        context.parameterDictionaries,
        context.librarySequences,
      ),
    }),
    handlebarsLanguage.extension,
    HandlebarsOverSeqLanguage.data.of({ autocomplete: completeFromList(handlebarsCompletions) }),
  ]);
  return extensions;
}

export function getSeqnHandlebarsLanguage(resources: PhoenixResources): InputLanguage {
  return {
    name: 'SeqN (Template)',
    fileExtension: '.template.seqN.txt',
    editorExtension: context => Object.values(getSeqnHandlebarsExtensions(resources, context)),
    commandInfoMapper: new SeqNCommandInfoMapper(),
    format: seqNFormat,
    getLibrarySequences: sequence => [seqnToLibrarySequence(sequence)],
  };
}
