import { LanguageSupport } from '@codemirror/language';
import type { Extension } from '@codemirror/state';
import type { InputLanguage } from '../../interfaces/language.js';
import type { PhoenixContext, PhoenixResources } from '../../interfaces/phoenix.js';
import { getFprimeLRLanguage } from './fprime.js';
import { FPrimeCommandInfoMapper } from './fprime-tree-utils.js';
import { fprimeLinter } from './fprime-linter.js';
import { fprimeTooltip } from './fprime-tooltip.js';

/**
 * Get keyed object for F' editor extensions to more easily replace/extend components.
 */
export function getFprimeExtensions(
  resources: PhoenixResources,
  context: PhoenixContext,
  mapper?: FPrimeCommandInfoMapper,
): { [key: string]: Extension } {
  mapper = mapper ?? new FPrimeCommandInfoMapper();
  const fprimeLRLanguage = getFprimeLRLanguage(resources);
  return {
    languageSupport: new LanguageSupport(fprimeLRLanguage),
    linter: resources.linter(fprimeLinter),
    tooltip: fprimeTooltip(context.commandDictionary, resources),
    // Future extensions can be added here:
    // - completion: for command/argument autocomplete
  };
}

/**
 * F' (fprime) sequence language definition for Phoenix.
 * Supports NASA's F' flight software sequencing format.
 */
export const fprimeLanguage: InputLanguage = {
  name: 'F-Prime',
  fileExtension: '.seq',
  getEditorExtension: (context, resources) => Object.values(getFprimeExtensions(resources, context)),
  commandInfoMapper: new FPrimeCommandInfoMapper(),
};
