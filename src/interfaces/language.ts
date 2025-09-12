import { EditorView } from "codemirror";
import { CommandInfoMapper } from "./command-info-mapper.js";
import { LibrarySequenceSignature, PhoenixContext, UserSequence } from "./phoenix.js";
import type { Extension } from '@codemirror/state';

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
