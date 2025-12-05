import { syntaxTree } from '@codemirror/language';
import { Diagnostic } from '@codemirror/lint';
import { TOKEN_ERROR } from './stol-constants';
import { STOLCommandInfoMapper } from './stol-tree-utils';
import { EditorView } from '@codemirror/view';
import { PhoenixContext } from 'interfaces/phoenix';
import { GlobalVariable } from 'types/global-types';
import { Tree } from '@lezer/common';

/**
 * Linter function that returns a Code Mirror extension function.
 * Can be optionally called with a command dictionary so it's available during linting.
 *
 * Currently, only supports showing parser/grammar errors
 */
export function stolLinter(
  view: EditorView,
  phoenixContext: PhoenixContext,
  globalVariables: GlobalVariable[],
  mapper: STOLCommandInfoMapper,
): Diagnostic[] {
  const tree = syntaxTree(view.state);
  const diagnostics = [];

  diagnostics.push(...validateParserErrors(tree));

  return diagnostics;
}

/**
 * Checks for unexpected tokens.
 *
 * @param tree
 * @returns
 */
function validateParserErrors(tree: Tree) {
  const diagnostics: Diagnostic[] = [];
  const MAX_PARSER_ERRORS = 100;
  tree.iterate({
    enter: node => {
      if (node.name === TOKEN_ERROR && diagnostics.length < MAX_PARSER_ERRORS) {
        const { from, to } = node;
        diagnostics.push({
          from,
          message: `Unexpected token`,
          severity: 'error',
          to,
        });
      }
    },
  });
  return diagnostics;
}