import type { Extension } from '@codemirror/state';
import type { ChannelDictionary, CommandDictionary, ParameterDictionary } from '@nasa-jpl/aerie-ampcs';
import type { VariableDeclaration } from '@nasa-jpl/seq-json-schema/types';
import type { EditorView } from 'codemirror';
import type { CommandInfoMapper } from './command-info-mapper';
import type { Tooltip } from '@codemirror/view';

export type UserSequence = {
  definition: string;
  name: string;
};

export type LibrarySequenceSignature = {
  name: string;
  parameters: VariableDeclaration[];
};

/**
 * Static resources for adaptations to leverage core capabilities.
 */
export type CreateTooltip = (text: string[], from: number, to?: number) => Tooltip;

export interface PhoenixResources {
  createTooltip: CreateTooltip;
}

/**
 * Dynamic context
 * 
 * TODO consider whether we can abstract all knowledge of library sequences out of the UI
 * That would mean we could have library sequences accessible via PhoenixContext and let 
 * the adaptation decide what to do. Right now, if we want dictionaries accessible to 
 * `getLibrarySequences`, we create a circular dependency since the context contains the 
 * library sequences.
 */
export interface PhoenixContext {
  commandDictionary: CommandDictionary | null;
  channelDictionary: ChannelDictionary | null;
  parameterDictionaries: ParameterDictionary[];
  librarySequences: LibrarySequenceSignature[];
}

export interface BaseLanguage {
  name: string;
  fileExtension: string;
  editorExtension?: (context: PhoenixContext) => Extension;
}

export interface InputLanguage extends BaseLanguage {
  commandInfoMapper: CommandInfoMapper;
  format?: (view: EditorView, context: PhoenixContext) => void;
  getLibrarySequences?: (sequence: UserSequence) => LibrarySequenceSignature[];
}

export interface OutputLanguage extends BaseLanguage {
  toOutputFormat: (input: string, context: PhoenixContext, name: string) => string;
  toInputFormat: (output: string, context: PhoenixContext, name: string) => string;
}

export interface PhoenixLanguages {
  input: InputLanguage;
  outputs: OutputLanguage[];
}

export interface PhoenixAdaptation {
  getLanguages: (resources: PhoenixResources) => PhoenixLanguages;
}
