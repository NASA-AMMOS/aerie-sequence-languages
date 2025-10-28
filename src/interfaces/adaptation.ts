import { InputLanguage, OutputLanguage } from './language.js';

/**
 * Adaptation implementations comply with this interface.
 */
export interface PhoenixAdaptation {
  input: InputLanguage;
  outputs: OutputLanguage[];
}
