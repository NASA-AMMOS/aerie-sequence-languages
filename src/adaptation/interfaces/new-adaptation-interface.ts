import type { Extension } from '@codemirror/state';
import type { ChannelDictionary, CommandDictionary, ParameterDictionary } from '@nasa-jpl/aerie-ampcs';
import type { VariableDeclaration } from '@nasa-jpl/seq-json-schema/types';
import type { EditorView } from 'codemirror';
import type { CommandInfoMapper } from './command-info-mapper';

export type UserSequence = {
  definition: string;
  name: string;
};

export type LibrarySequenceSignature = {
  name: string;
  parameters: VariableDeclaration[];
};

export type LibrarySequenceMap = { [sequenceName: string]: LibrarySequenceSignature }; // TODO drat, I forgot this depends on `LibrarySequenceSignature`...

export interface PhoenixContext {
  commandDictionary: CommandDictionary | null;
  channelDictionary: ChannelDictionary | null;
  parameterDictionaries: ParameterDictionary[];
  librarySequenceMap: LibrarySequenceMap;
}

export interface LanguageAdaptation {
  name: string;
  fileExtension: string;
  editorExtension?: (context: PhoenixContext) => Extension;
  commandInfoMapper: CommandInfoMapper;
  format?: (view: EditorView) => void;
  getLibrarySequences?: (sequence: UserSequence) => LibrarySequenceSignature[];
}

export interface OutputLanguageAdaptation extends Omit<LanguageAdaptation, 'commandInfoMapper' | 'format'> {
  toOutputFormat: (input: string, context: PhoenixContext, name: string) => string;
  toInputFormat: (output: string, context: PhoenixContext, name: string) => string;
}

export interface NewAdaptationInterface {
  input: LanguageAdaptation;
  outputs: OutputLanguageAdaptation[];
}
