import { PhoenixContext } from "interfaces/phoenix";
import { STOLCommandInfoMapper } from "./stol-tree-utils";
import { GlobalVariable } from "types/global-types";
import { Completion, CompletionContext, CompletionResult } from "@codemirror/autocomplete";

/**
 * Completion function that returns a Code Mirror extension function.
 * Can be optionally called with a command dictionary so it's available for completion.
 */
export function stolCompletion(
  phoenixContext: PhoenixContext,
  globals: GlobalVariable[],
  mapper: STOLCommandInfoMapper,
) {
  return (context: CompletionContext): CompletionResult | null => {
    const word = context.matchBefore(/\w*/);
    if (word) {
      if (word.from === word.to && !context.explicit) {
        return null;
      }

      const timeTagCompletions: Completion[] = [];
      const enumerationCompletions: Completion[] = [];
      const fswCommandsCompletions: Completion[] = [];
      const hwCommandsCompletions: Completion[] = [];
      const directivesCompletions: Completion[] = [];
      const globalCompletions: Completion[] = [];
      const libraryCompletions: Completion[] = [];

      directivesCompletions.push(
        {
          apply: 'WAIT 0',
          info: 'WAIT an amount of seconds before continuing execution',
          label: 'WAIT (seconds)',
          section: 'Directives',
          type: 'keyword',
        },
        {
          apply: 'WAIT UNTIL VARIABLE',
          info: 'WAIT UNTIL the time stored within a variable',
          label: 'WAIT UNTIL (variable)',
          section: 'Directives',
          type: 'keyword',
        },
        {
          apply: 'WAIT UNTIL 1970-001-00:00:00',
          info: 'WAIT UNTIL a specific time before continuing execution',
          label: 'WAIT UNTIL (time)',
          section: 'Directives',
          type: 'keyword',
        },
        {
          apply: 'CMDN=1',
          info: 'Specify a specific command number to begin with.',
          label: 'CMDN (command number)',
          section: 'Directives',
          type: 'keyword',
        },
      );
      return {
        from: word.from,
        options: [
          ...directivesCompletions,
          ...timeTagCompletions,
          ...enumerationCompletions,
          ...fswCommandsCompletions,
          ...hwCommandsCompletions,
          ...globalCompletions,
          ...libraryCompletions,
        ],
      }
    };
    return null
  }
}
