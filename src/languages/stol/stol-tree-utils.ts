import type { SyntaxNode, Tree } from '@lezer/common';
import type {
  CommandDictionary,
  EnumMap,
  FswCommand,
  FswCommandArgument,
  FswCommandArgumentRepeat,
} from '@nasa-jpl/aerie-ampcs';
import { STOL_NODES } from './stol-grammar-constants.js';
import type { EditorView } from '@codemirror/view';
import type { LibrarySequenceSignature, PhoenixContext } from '../../interfaces/phoenix.js';
import type { ArgTextDef, TimeTagInfo } from '../../interfaces/command-info-mapper.js';
import { fswCommandArgDefault, isFswCommandArgumentRepeat } from '../../utils/sequence-utils.js';
import type { CommandInfoMapper } from '../../interfaces/command-info-mapper.js';
import { GlobalVariable } from '../../types/global-types.js';
import { TOKEN_ERROR } from './stol-constants';

export function getNameNode(stepNode: SyntaxNode | null) {
  // TODO
  return null;
}

export function getAncestorStepOrRequest(node: SyntaxNode | null) {
  // TODO
  return null;
}

export class STOLCommandInfoMapper implements CommandInfoMapper {
  globals: GlobalVariable[];

  constructor(globals?: GlobalVariable[]) {
    this.globals = globals ?? [];
  }

  getArgumentAppendPosition(commandOrRepeatArgNode: SyntaxNode | null): number | undefined {
    // TODO
    return undefined;
  }

  getArgumentNodeContainer(commandNode: SyntaxNode | null): SyntaxNode | null {
    return commandNode?.getChild(STOL_NODES.ARG_NAME) ?? null;
  }

  getArgumentsFromContainer(containerNode: SyntaxNode | null): SyntaxNode[] {
    const children: SyntaxNode[] = [];

    let child = containerNode?.firstChild;
    while (child) {
      children.push(child);
      child = child.nextSibling;
    }

    return children;
  }

  getContainingCommand(node: SyntaxNode | null): SyntaxNode | null {
    return getAncestorStepOrRequest(node);
  }

  getDefaultValueForArgumentDef(argDef: FswCommandArgument, enumMap: EnumMap): string {
    return fswCommandArgDefault(argDef, enumMap);
  }

  getNameNode(stepNode: SyntaxNode | null): SyntaxNode | null {
    return getNameNode(stepNode);
  }

  getVariables(docText: string, tree: Tree): string[] {
    // TODO
    return [];
  }

  isArgumentNodeOfVariableType(argNode: SyntaxNode | null): boolean {
    // TODO
    return false;
  }

  isByteArrayArg(): boolean {
    // TODO
    return false;
  }

  nodeTypeEnumCompatible(node: SyntaxNode | null): boolean {
    // TODO
    return false;
  }

  nodeTypeHasArguments(node: SyntaxNode | null): boolean {
    return node?.name === STOL_NODES.COMMAND;
  }

  nodeTypeNumberCompatible(node: SyntaxNode | null): boolean {
    return node?.name === STOL_NODES.NUMBER;
  }

  getTimeTagInfo(seqEditorView: EditorView, commandNode: SyntaxNode | null): TimeTagInfo {
    const node = commandNode?.getChild(STOL_NODES.DATE_TIME);

    return (
      node && {
        node,
        text: seqEditorView.state.sliceDoc(node.from, node.to) ?? '',
      }
    );
  }

  getArgumentInfo(
    commandDef: FswCommand | null,
    seqEditorView: EditorView,
    args: SyntaxNode | null,
    argumentDefs: FswCommandArgument[] | undefined,
    parentArgDef: FswCommandArgumentRepeat | undefined,
    phoenixContext: PhoenixContext,
  ): ArgTextDef[] {
    const argArray: ArgTextDef[] = [];
    const precedingArgValues: string[] = [];
    const parentRepeatLength = parentArgDef?.repeat?.arguments.length;

    if (args) {
      for (const node of this.getArgumentsFromContainer(args)) {
        if (node.name === TOKEN_ERROR) {
          continue;
        }

        let argDef: FswCommandArgument | undefined = undefined;
        if (argumentDefs) {
          let argDefIndex = argArray.length;
          if (parentRepeatLength !== undefined) {
            // for repeat args shift index
            argDefIndex %= parentRepeatLength;
          }
          argDef = argumentDefs[argDefIndex];
        }

        if (commandDef && argDef) {
          argDef = this.getArgumentDef(commandDef?.stem, argDef, precedingArgValues, phoenixContext);
        }

        let children: ArgTextDef[] | undefined = undefined;
        if (!!argDef && isFswCommandArgumentRepeat(argDef)) {
          children = this.getArgumentInfo(
            commandDef,
            seqEditorView,
            node,
            argDef.repeat?.arguments,
            argDef,
            phoenixContext,
          );
        }
        const argValue = seqEditorView.state.sliceDoc(node.from, node.to);
        argArray.push({
          argDef,
          children,
          node,
          parentArgDef,
          text: argValue,
        });
        precedingArgValues.push(argValue);
      }
    }
    // add entries for defined arguments missing from editor
    if (argumentDefs) {
      if (!parentArgDef) {
        argArray.push(...argumentDefs.slice(argArray.length).map(argDef => ({ argDef })));
      } else {
        const repeatArgs = parentArgDef?.repeat?.arguments;
        if (repeatArgs) {
          if (argArray.length % repeatArgs.length !== 0) {
            argArray.push(...argumentDefs.slice(argArray.length % repeatArgs.length).map(argDef => ({ argDef })));
          }
        }
      }
    }

    return argArray;
  }

  getCommandDef(
    commandDictionary: CommandDictionary | null,
    librarySequences: LibrarySequenceSignature[],
    stemName: string,
  ): FswCommand | null {
    const commandDefFromCommandDictionary = commandDictionary?.fswCommandMap[stemName];
    if (commandDefFromCommandDictionary) {
      return commandDefFromCommandDictionary;
    } else {
      return null;
    }
  }

  getArgumentDef(
    stem: string,
    defaultArgDef: FswCommandArgument,
    precedingArgs: string[],
    context: PhoenixContext,
  ): FswCommandArgument {
    return defaultArgDef;
  }

  getVariablesInScope(seqEditorView: EditorView, tree: Tree | null, cursorPosition?: number): string[] {
    const globalNames = this.globals.map(globalVariable => globalVariable.name);
    if (tree && cursorPosition !== undefined) {
      const docText = seqEditorView.state.doc.toString();
      return [...globalNames, ...this.getVariables(docText, tree)];
    }
    return globalNames;
  }

  formatArgumentArray(values: string[]): string {
    return ' ' + values.join(' ');
  }
}
