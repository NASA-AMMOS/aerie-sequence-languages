import type { Extension } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';
import { CommandInfoMapper } from './command-info-mapper.js';
import type { LibrarySequenceSignature, PhoenixContext, UserSequence } from './phoenix.js';

/**
 * Base object properties for either input or output languages in Phoenix.
 */
export interface BaseLanguage {
  name: string;
  fileExtension: string;
  editorExtension?: (context: PhoenixContext) => Extension[];
}

/**
 * Extension of base language implementation for "input" (authoring) language definition adds
 * `commandInfoMapper`, which feeds the Phoenix UI command panel, `format` to apply code
 * formatting, and `getLibrarySequences` to tell Phoenix how to evaluate a call signature(s) given
 * other sequence files in the workspace.
 */
export interface InputLanguage extends BaseLanguage {
  commandInfoMapper: CommandInfoMapper;
  format?: (view: EditorView, context: PhoenixContext) => void;
  getLibrarySequences?: (sequence: UserSequence) => LibrarySequenceSignature[];
}

/**
 * Extension of base language implementation for "output" language definition adds converters that,
 * for each output language, convert to/from the specified input language.
 */
export interface OutputLanguage extends BaseLanguage {
  toOutputFormat: (input: string, context: PhoenixContext, name: string) => string;
  toInputFormat: (output: string, context: PhoenixContext, name: string) => string;
}
