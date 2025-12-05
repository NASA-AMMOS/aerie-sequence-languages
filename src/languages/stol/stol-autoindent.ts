import { syntaxTree, type IndentContext } from '@codemirror/language';
import { getNearestAncestorNodeOfType } from '../../utils/tree-utils';

const TAB_SIZE = 4;
/**
 * Returns a function that provides auto-indentation for the CodeMirror editor.
 * The indentation rules are as follows:
 * - If the previous line contains '@REQUEST_BEGIN', indent one level.
 * - If the current line contains '@REQUEST_END', reset the indentation.
 * - If the current line is inside a request block, indent one level.
 *
 * @param {IndentContext} context - The context object containing information about the editor state.
 * @param {number} pos - The position in the editor where indentation is needed.
 * @return {number | null | undefined} The number of spaces to indent or null/undefined if no indentation is needed.
 */
export function stolAutoIndent(): (context: IndentContext, pos: number) => number | null | undefined {
  return (context, pos) => {
    // Check for a preceding command time to indent off of
    const commandTimeOffsetNode = getNearestAncestorNodeOfType(syntaxTree(context.state).cursorAt(pos-1).node, ['CommandTimeOffset'])
    const commandTimeExactNode = getNearestAncestorNodeOfType(syntaxTree(context.state).cursorAt(pos-1).node.prevSibling, ['WaitUntil'])

    if (commandTimeOffsetNode || commandTimeExactNode) {
      return TAB_SIZE;
    }

    // Check if multi-line arguments to a command
    // TODO: Maybe this should be smarter in the future and consider the dictionary definition?
    const commandNameOrArgNode = getNearestAncestorNodeOfType(syntaxTree(context.state).cursorAt(pos-1).node, ['CommandName', 'CommandArg'])
    if (commandNameOrArgNode) {
      return TAB_SIZE * 2;
    }

    // otherwise, don't indent
    return 0;
  };
}