import type { ChannelDictionary, CommandDictionary, ParameterDictionary } from '@nasa-jpl/aerie-ampcs';
import type { VariableDeclaration } from '@nasa-jpl/seq-json-schema/types';
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
 * Static resources for adaptations to abstract interactions with UI/Phoenix core capabilities.
 */
export type CreateTooltip = (text: string[], from: number, to?: number) => Tooltip;

export interface PhoenixResources {
  createTooltip: CreateTooltip;
}

/**
 * Dynamic Phoenix context used by adaptation components. Dictionaries are available if included in
 * the current parcel.
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
