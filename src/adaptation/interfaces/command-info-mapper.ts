import type { SyntaxNode, Tree } from '@lezer/common';
import type {
  ChannelDictionary,
  CommandDictionary,
  EnumMap,
  FswCommand,
  FswCommandArgument,
  FswCommandArgumentRepeat,
  FswCommandArgumentVarString,
  FswCommandArgumentFixedString,
  ParameterDictionary,
} from '@nasa-jpl/aerie-ampcs';
import type { EditorView } from 'codemirror';
import type { LibrarySequenceSignature } from './new-adaptation-interface';

export type TimeTagInfo = { node: SyntaxNode; text: string } | null | undefined;

export type StringArg = FswCommandArgumentVarString | FswCommandArgumentFixedString;

export type ArgTextDef = {
  argDef?: FswCommandArgument;
  children?: ArgTextDef[];
  node?: SyntaxNode;
  parentArgDef?: FswCommandArgumentRepeat;
  text?: string;
};
export interface CommandInfoMapper {
  // TODO is there a way we can generalize what's in the command panel?
  /** format string of multiple arguments */
  formatArgumentArray(values: string[], commandNode: SyntaxNode | null): string;

  /** get insert position for missing arguments */
  getArgumentAppendPosition(node: SyntaxNode | null): number | undefined;

  /** gets container of arguments from subtree */
  getArgumentNodeContainer(commandNode: SyntaxNode | null): SyntaxNode | null;

  /** collects argument nodes from sub-tree of this command argument container */
  getArgumentsFromContainer(containerNode: SyntaxNode): SyntaxNode[];

  getByteArrayElements?(node: SyntaxNode | null, arrayText: string): string[] | null;

  /** ascends parse tree to find scope to display in form editor */
  getContainingCommand(node: SyntaxNode | null): SyntaxNode | null;

  getDefaultValueForArgumentDef(argDef: FswCommandArgument, enumMap: EnumMap): string;

  /** finds the node in the parse tree containing the name */
  getNameNode(stepNode: SyntaxNode | null): SyntaxNode | null;

  /**
   * collect variables for populating select box, cursor position is used to limit scope to containing
   * sequence in multiple sequence per file languages
   */
  // Consider filtering by type or allowing adaptation to filter by type
  // not clear at this point what FSW does in terms of type coercion and
  // what variable types are used for enums arguments
  getVariables(docText: string, tree: Tree, cursor: number): string[];

  /** is argument node a variable, false implies literal */
  isArgumentNodeOfVariableType(argNode: SyntaxNode | null): boolean;

  isByteArrayArg(argNode: SyntaxNode | null): boolean;

  /** checks if select list should be used */
  nodeTypeEnumCompatible(node: SyntaxNode | null): boolean;

  /** checks if node has knowable argument types */
  nodeTypeHasArguments(node: SyntaxNode | null): boolean;

  /** checks if numeric argument editor should be displayed */
  nodeTypeNumberCompatible(node: SyntaxNode | null): boolean;

  /** Extracts time tag from a given command node */
  getTimeTagInfo(seqEditorView: EditorView, node: SyntaxNode | null): TimeTagInfo;

  getArgumentInfo(
    commandDef: FswCommand | null,
    channelDictionary: ChannelDictionary | null,
    seqEditorView: EditorView,
    args: SyntaxNode | null,
    argumentDefs: FswCommandArgument[] | undefined,
    parentArgDef: FswCommandArgumentRepeat | undefined,
    parameterDictionaries: ParameterDictionary[],
  ): ArgTextDef[];

  getCommandDef(
    commandDictionary: CommandDictionary | null,
    librarySequences: LibrarySequenceSignature[],
    stemName: string,
  ): FswCommand | null;

  getVariablesInScope(seqEditorView: EditorView, tree: Tree | null, cursorPosition?: number): string[];
}
