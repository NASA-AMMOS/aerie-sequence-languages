import type { SyntaxNode, Tree } from '@lezer/common';
import type { CommandDictionary, FswCommandArgument } from '@nasa-jpl/aerie-ampcs';
import { getBalancedDuration, parseDurationString, TimeTypes, validateTime } from '@nasa-jpl/aerie-time-utils';
import { SATF_SASF_NODES } from '../languages/satf/constants/satf-sasf-constants.js';
import { SatfLanguage } from '../languages/satf/grammar/satf-sasf.js';
import { ParsedSatf, ParsedSeqn, ParseSasf, Seqn } from '../languages/satf/types/types.js';
import { seqnParser } from '../languages/seq-n/seq-n.js';
import { SEQN_NODES } from '../languages/seq-n/seqn-grammar-constants.js';
import { removeEscapedQuotes, removeQuote, unquoteUnescape } from '../utils/string.js';
import { parseVariables } from './seqnToSeqJson.js';
/**
 * Asynchronously converts a parsed SeqN tree via lezer into a structured SATF representation.
 *
 * Parse different sections (metadata, variables, steps) of the SeqN tree and
 * assemble them into a `ParsedSatf` object containing the corresponding SATF sections.
 *
 * @async
 * @param {string} sequence - The original SeqN source text corresponding to the `seqnTree`.
 * @param {string[]} [globalVariables] - Optional. A list of predefined global variable names to be used
 * @param {CommandDictionary} [commandDictionary] - Optional. A dictionary containing command definitions.
 * @returns {Promise<ParsedSatf>} A Promise that resolves to an object containing the generated
 * SATF `header`, `parameters , `variables`, and `steps` block strings (or undefined if a section is empty/not generated).
 */
export async function seqnToSATF(
  seqn: string,
  globalVariables?: string[],
  commandDictionary?: CommandDictionary,
): Promise<ParsedSatf> {
  const seqnTree = seqnParser.parse(seqn);
  const header = parseHeaderfromSeqn(seqnTree, seqn);
  const parameters = satfVariablesFromSeqn(seqnTree, seqn);
  const variables = satfVariablesFromSeqn(seqnTree, seqn, 'Variables');

  const steps = satfStepsFromSeqn(
    seqnTree,
    seqn,
    [...(globalVariables ? globalVariables : []), ...getSatfVariableNames(seqnTree, seqn)],
    commandDictionary,
  );
  return {
    header,
    ...(parameters ? { parameters } : {}),
    ...(variables ? { variables } : {}),
    ...(steps ? { steps } : {}),
  };
}

/**
 * Asynchronously converts a parsed SeqN tree via lezer into a structured SASF representation.
 *
 * Parse the metadata section and generate SASF request blocks from the SeqN tree.
 * It then combines these into a `ParsedSasf` object.
 *
 * @async
 * @param {string} sequence - The original SeqN source text corresponding to the `seqnTree`.
 * @param {string[]} [globalVariables] - Optional. A list of predefined global variable names to be used
 *
 * @param {CommandDictionary} [commandDictionary] - Optional. A dictionary containing command definitions,
 * @returns {Promise<ParsedSasf>} A Promise that resolves to an object containing the generated
 * SASF `metadata` string and the concatenated `requests` string (or undefined if a section is empty/not generated).
 */
export async function seqnToSASF(
  seqn: string,
  globalVariables?: string[],
  commandDictionary?: CommandDictionary,
): Promise<ParseSasf> {
  const seqnTree = seqnParser.parse(seqn);
  const header = parseHeaderfromSeqn(seqnTree, seqn);

  // TODO: I don't think sasf have varaibles or parameters:
  // const parameters = satfVariablesFromSeqn(seqnTree, seqn);
  // const variables = satfVariablesFromSeqn(seqnTree, seqn, 'Variables');
  const requests = sasfRequestFromSeqN(seqnTree, seqn, globalVariables, commandDictionary);

  return {
    header,
    requests,
  };
}

function parseHeaderfromSeqn(seqnTree: Tree, sequence: string): Record<string, string> {
  const metadata: Record<string, string> = {};
  const metadataEntries = seqnTree.topNode.getChild(SEQN_NODES.METADATA)?.getChildren(SEQN_NODES.METADATA_ENTRY) ?? [];

  for (const entry of metadataEntries) {
    const keyNode = entry.getChild(SEQN_NODES.KEY);
    const valueNode = entry.getChild(SEQN_NODES.VALUE);

    if (keyNode === null || valueNode === null) {
      continue;
    }

    const key = unquoteUnescape(sequence.slice(keyNode.from, keyNode.to));
    const value = sequence.slice(valueNode.from, valueNode.to);

    metadata[key] = value;
  }

  let commentMetadata = seqnTree.topNode.getChildren(SEQN_NODES.LINE_COMMENT);
  if (commentMetadata.length === 0) {
    commentMetadata = seqnTree.topNode.getChild(SEQN_NODES.COMMANDS)?.getChildren(SEQN_NODES.LINE_COMMENT) ?? [];
  }

  for (const comment of commentMetadata) {
    const text = sequence.slice(comment.from, comment.to);
    const [key, value] = text.split('=').map(unquoteUnescape);

    if (key && value) {
      metadata[key.slice(1).trim()] = value;
    }
  }

  return metadata;
}

function satfStepsFromSeqn(
  seqnTree: Tree,
  sequence: string,
  variables: string[],
  commandDictionary?: CommandDictionary,
): string | undefined {
  let stepNode = seqnTree.topNode.getChild(SATF_SASF_NODES.COMMANDS)?.firstChild;
  let steps = [];
  while (stepNode) {
    steps.push(stepNode);
    stepNode = stepNode.nextSibling;
  }

  steps = steps.filter((step: SyntaxNode) => step.name !== SATF_SASF_NODES.LINE_COMMENT);

  if (steps === null || steps.length === 0) {
    return undefined;
  }
  return `STEPS,\n${steps
    .map((step, index) => {
      return parseSeqNStep(step, sequence, commandDictionary, variables, 1 + index++);
    })
    .filter((step: string | undefined) => step)
    .join('\n')}\nend`;
}

function parseSeqNStep(
  child: SyntaxNode | null,
  text: string,
  commandDictionary: CommandDictionary | undefined,
  variables: string[],
  order: number,
): string | undefined {
  switch (child?.name) {
    case SEQN_NODES.COMMAND:
      return parseSeqNCommand(child, text, commandDictionary, variables, order);
    case SEQN_NODES.ACTIVATE:
      return parseSeqNActivate(child, text, commandDictionary, variables, order);
    case 'Load':
    case 'GroundBlock':
    case 'GroundEvent':
    default:
      return undefined;
  }
}

function parseSeqNCommand(
  commandNode: SyntaxNode,
  sequence: string,
  commandDictionary: CommandDictionary | undefined,
  variables: string[],
  order: number,
): string {
  const time = parseSeqNTime(commandNode, sequence);

  const stemNode = commandNode.getChild(SEQN_NODES.STEM);
  const stem = stemNode ? sequence.slice(stemNode.from, stemNode.to) : 'UNKNOWN';

  const argsNode = commandNode.getChild(SEQN_NODES.ARGS);
  const args = argsNode ? parseSeqNArgs(argsNode, sequence, commandDictionary, variables, stem) : [];
  const description = parseSeqNDescription(commandNode, sequence);
  const metadata = parsSeqNMetadata(commandNode, sequence, [SEQN_NODES.NTEXT]);
  const models = parseSeqNModel(commandNode, sequence);
  return (
    `${'\t'}command(${order},` +
    `\n${'\t'.repeat(2)}SCHEDULED_TIME,\\${time.tag}\\,${time.type},` +
    `${metadata ? `\n${'\t'.repeat(2)}${metadata},` : ''}` +
    `${description ? `\n${'\t'.repeat(2)}COMMENT,\\${description}\\,` : ''}` +
    `${models ? `\n${'\t'.repeat(2)}ASSUMED_MODEL_VALUES,\\${models}\\,` : ''}` +
    `\n${'\t'.repeat(2)}${stem}${args.length !== 0 ? `(${serializeSeqNArgs(args)})` : ''}` +
    `\n${'\t'}),`
  );
}

function parseSeqNActivate(
  stepNode: SyntaxNode,
  sequence: string,
  commandDictionary: CommandDictionary | undefined,
  variables: string[],
  order: number,
): string {
  const nameNode = stepNode.getChild(SEQN_NODES.SEQUENCE_NAME);
  const sequenceName = nameNode ? unquoteUnescape(sequence.slice(nameNode.from, nameNode.to)) : 'UNKNOWN';
  const time = parseSeqNTime(stepNode, sequence);

  const argsNode = stepNode.getChild(SEQN_NODES.ARGS);
  const args = argsNode ? parseSeqNArgs(argsNode, sequence, commandDictionary, variables, sequenceName) : [];

  const engine = parseSeqNEngine(stepNode, sequence);
  const epoch = parseSeqNEpoch(stepNode, sequence);

  return `${'\t'}SPAWN(${order},
  ${'\t'.repeat(2)}SCHEDULED_TIME,\\${time.tag}\\,${time.type},${
    engine !== undefined
      ? `
  ${'\t'.repeat(2)}RETURN_ENGINE_ID_TO,\\${engine}\\,`
      : ''
  }${
    epoch !== undefined
      ? `
  ${'\t'.repeat(2)}EPOCH,${epoch},`
      : ''
  }
  ${'\t'.repeat(2)}RT_on_board_block(${sequenceName},${serializeSeqNArgs(args)})
  ${'\t'}),`;
}

function parseSeqNEngine(stepNode: SyntaxNode, text: string): number | undefined {
  const engineNode = stepNode.getChild(SATF_SASF_NODES.ENGINE)?.getChild(SATF_SASF_NODES.NUMBER);
  return engineNode ? parseInt(text.slice(engineNode.from, engineNode.to), 10) : undefined;
}

function parseSeqNEpoch(stepNode: SyntaxNode, text: string): string | undefined {
  const epochNode = stepNode.getChild(SATF_SASF_NODES.EPOCH)?.getChild(SATF_SASF_NODES.STRING);
  return epochNode ? unquoteUnescape(text.slice(epochNode.from, epochNode.to)) : undefined;
}

function parseSeqNTime(
  commandNode: SyntaxNode,
  sequence: string,
): {
  tag: string;
  type:
    | 'UNKNOWN'
    | 'ABSOLUTE'
    | 'WAIT_PREVIOUS_END'
    | 'EPOCH'
    | 'FROM_PREVIOUS_START'
    | 'GROUND_EPOCH'
    | 'FROM_REQUEST_START';
} {
  const tag = '00:00:01';
  const timeTagNode = commandNode.getChild('TimeTag');
  if (timeTagNode === null) {
    return { tag: '00:00:00', type: 'UNKNOWN' };
  }

  const time = timeTagNode.firstChild;
  if (time === null) {
    return { tag, type: 'UNKNOWN' };
  }

  const timeValue = sequence.slice(time.from + 1, time.to).trim();

  if (time.name === SEQN_NODES.TIME_COMPLETE) {
    return { tag, type: 'WAIT_PREVIOUS_END' };
  }
  if (validateTime(timeValue, TimeTypes.ISO_ORDINAL_TIME)) {
    return { tag: timeValue, type: 'ABSOLUTE' };
  } else {
    let type:
      | 'UNKNOWN'
      | 'ABSOLUTE'
      | 'WAIT_PREVIOUS_END'
      | 'EPOCH'
      | 'FROM_PREVIOUS_START'
      | 'GROUND_EPOCH'
      | 'FROM_REQUEST_START' = 'UNKNOWN';
    switch (time.name) {
      case SEQN_NODES.TIME_GROUND_EPOCH:
        type = 'GROUND_EPOCH';
        break;
      case SEQN_NODES.TIME_EPOCH:
        type = 'EPOCH';
        break;
      case SEQN_NODES.TIME_RELATIVE:
        type = 'FROM_PREVIOUS_START';
        break;
      case SEQN_NODES.TIME_BLOCK_RELATIVE:
        type = 'FROM_REQUEST_START';
        break;
    }

    if (validateTime(timeValue, TimeTypes.DOY_TIME)) {
      const balancedTime = getBalancedDuration(timeValue);

      return {
        tag: balancedTime,
        type,
      };
    } else if (validateTime(timeValue, TimeTypes.SECOND_TIME)) {
      let balancedTime = getBalancedDuration(timeValue);
      if (parseDurationString(balancedTime, 'seconds').milliseconds === 0) {
        balancedTime = balancedTime.slice(0, -4);
      }

      return { tag: balancedTime, type };
    }
  }
  return { tag, type: 'UNKNOWN' };
}

function parseSeqNDescription(node: SyntaxNode, text: string): string | undefined {
  const descriptionNode = node.getChild(SEQN_NODES.LINE_COMMENT);
  if (!descriptionNode) {
    return undefined;
  }
  // +1 offset to drop '#' prefix
  const description = text.slice(descriptionNode.from + 1, descriptionNode.to).trim();
  return removeEscapedQuotes(description);
}

function parseSeqNArgs(
  argsNode: SyntaxNode,
  sequence: string,
  commandDictionary: CommandDictionary | undefined,
  variables: string[],
  stem: string,
): {
  name?: string;
  type: 'boolean' | 'enum' | 'number' | 'string';
  value: boolean | string;
}[] {
  const args = [];
  let argNode = argsNode.firstChild;
  const dictArguments = commandDictionary?.fswCommandMap[stem]?.arguments ?? [];
  let i = 0;

  while (argNode) {
    const dictionaryArg = dictArguments[i] ?? null;
    const arg = parseSeqNArg(argNode, sequence, dictionaryArg, variables);

    if (arg) {
      args.push(arg);
    }

    argNode = argNode?.nextSibling;
    i++;
  }

  return args;
}

function parseSeqNArg(
  argNode: SyntaxNode,
  sequence: string,
  dictionaryArg: FswCommandArgument | null,
  variables: string[],
):
  | {
      name?: string | undefined;
      type: 'boolean' | 'enum' | 'number' | 'string';
      value: boolean | string;
    }
  | undefined {
  const nodeValue = sequence.slice(argNode.from, argNode.to);

  if (variables.includes(nodeValue)) {
    return {
      name: undefined,
      type: 'enum' as const,
      value: `${nodeValue}`,
    };
  }

  switch (argNode.name) {
    case SEQN_NODES.BOOLEAN: {
      return {
        name: dictionaryArg ? dictionaryArg.name : undefined,
        type: 'boolean' as const,
        value: nodeValue === 'true' ? 'TRUE' : 'FALSE',
      };
    }
    case SEQN_NODES.ENUM: {
      return {
        name: dictionaryArg ? dictionaryArg.name : undefined,
        type: 'enum' as const,
        value: nodeValue,
      };
    }
    case SEQN_NODES.NUMBER: {
      const decimalCount = nodeValue.slice(nodeValue.indexOf('.') + 1).length;
      return {
        name: dictionaryArg ? dictionaryArg.name : undefined,
        type: 'number',
        value: parseFloat(nodeValue).toFixed(decimalCount),
      };
    }
    case SEQN_NODES.STRING: {
      return {
        name: dictionaryArg ? dictionaryArg.name : undefined,
        type: 'string',
        value: nodeValue,
      };
    }
    default: {
      break;
    }
  }
}

function serializeSeqNArgs(args: any[]): string {
  return args
    .map(arg => {
      return `${arg.value}`;
    })
    .join(', ');
}

function getSatfVariableNames(seqnTree: Tree, text: string): string[] {
  const types = [SEQN_NODES.PARAMETER_DECLARATION, SEQN_NODES.LOCAL_DECLARATION];
  const names: string[] = [];
  for (let i = 0; i < types.length; i++) {
    const variableContainer = seqnTree.topNode.getChild(types[i]);
    if (!variableContainer) {
      continue;
    }
    const variables = variableContainer.getChildren(SEQN_NODES.VARIABLE);
    if (!variables || variables.length === 0) {
      continue;
    }
    variables.forEach((variableNode: SyntaxNode) => {
      const nameNode = variableNode.getChild(SEQN_NODES.VARIABLE_NAME);
      if (nameNode) {
        names.push(text.slice(nameNode.from, nameNode.to));
      }
    });
  }
  return names;
}

function satfVariablesFromSeqn(
  seqnTree: Tree,
  text: string,
  type: 'Parameters' | 'Variables' = 'Parameters',
): string | undefined {
  let nType = 'ParameterDeclaration';
  if (type === 'Variables') {
    nType = 'LocalDeclaration';
  }

  const variables = parseVariables(seqnTree.topNode, text, nType as 'LocalDeclaration' | 'ParameterDeclaration')?.map(
    v => {
      const variable: {
        allowable_ranges?: any[];
        allowable_values?: any[];
        enum_name?: string;
        name: string;
        sc_name?: string;
        type: string;
      } = {
        name: v.name,
        type: v.type,
        enum_name: v.enum_name,
        allowable_ranges: v.allowable_ranges,
        allowable_values: v.allowable_values,
        sc_name: v.sc_name,
      };

      //convert seqn type to satf type
      switch (v.type) {
        case SEQN_NODES.VAR_UINT:
          variable.type = SATF_SASF_NODES.PARAM_UNSIGNED_DECIMAL;
          break;
        case SEQN_NODES.VAR_INT:
          variable.type = SATF_SASF_NODES.PARAM_SIGNED_DECIMAL;
          break;
        case SEQN_NODES.VAR_STRING:
          variable.type = SATF_SASF_NODES.PARAM_QUOTED_STRING;
          break;
        case SEQN_NODES.VAR_FLOAT:
          break;
        case SEQN_NODES.VAR_ENUM:
          variable.type = SATF_SASF_NODES.PARAM_STRING;
          break;
      }
      return variable;
    },
  );

  if (!variables) {
    return undefined;
  }

  const serializedVariables = variables
    ?.map(variable => {
      return (
        `\t${variable.name}` +
        `(\n\t\tTYPE,${variable.type}${variable.enum_name ? `,\n\t\tENUM_NAME,${variable.enum_name}` : ''}` +
        `${
          variable.allowable_ranges
            ? `,${variable.allowable_ranges
                .map(range => {
                  return `\n\t\tRANGE,\\${range.min}...${range.max}\\`;
                })
                .join(',')}`
            : ''
        }` +
        `${variable.allowable_values ? `,\n\t\tRANGE,\\${variable.allowable_values}\\` : ''}` +
        `${variable.sc_name ? `,\n\t\tSC_NAME,${variable.sc_name}` : ''}` +
        `\n\t)`
      );
    })
    .join(',\n');

  return `${type.toUpperCase()},\n ${serializedVariables},\nend,\n`;
}

function sasfRequestFromSeqN(
  seqnTree: Tree,
  sequence: string,
  variables: string[] = [],
  commandDictionary?: CommandDictionary,
): string | undefined {
  const requests = seqnTree.topNode.getChild(SEQN_NODES.COMMANDS)?.getChildren(SEQN_NODES.REQUEST);
  if (requests == null || requests.length === 0) {
    return undefined;
  }
  return requests
    .map((requestNode: SyntaxNode) => {
      const nameNode = requestNode.getChild(SEQN_NODES.REQUEST_NAME);
      const name = nameNode ? unquoteUnescape(sequence.slice(nameNode.from, nameNode.to)) : 'UNKNOWN';
      const parsedTime = parseSeqNTime(requestNode, sequence);
      const requester = parsSeqNMetadata(requestNode, sequence, ['REQUESTOR']);
      const processor = parsSeqNMetadata(requestNode, sequence, ['PROCESSOR']);
      const key = parsSeqNMetadata(requestNode, sequence, ['KEY']);
      const request =
        `request(${name},` +
        `\n\tSTART_TIME, ${parsedTime.tag},${parsedTime.type}` +
        `${requester ? `,\n\t${requester.replaceAll('\\', '"')}` : ''}` +
        `${processor ? `,\n\t${processor.replaceAll('\\', '"')}` : ''}` +
        `${key ? `,\n\t${key.replaceAll('\\', '"')}` : ''})`;
      `\n\n`;
      let order = 1;
      let child = requestNode?.getChild(SEQN_NODES.STEPS)?.firstChild;
      const steps = [];

      while (child) {
        steps.push(
          `\t${parseSeqNStep(child, sequence, commandDictionary, variables, order++)?.replaceAll('\n', '\n\t')}`,
        );
        child = child?.nextSibling;
      }

      return `${request}\n${steps.join('\n')}\nend;\n`;
    })
    .join(',\n');
}

/**
 * Parses a SATF formatted string asynchronously to extract header information and sequence data.
 * It utilizes the SatfLanguage parser to generate SeqN parts.
 *
 * @async
 * @function satfToSeqn
 * @param {string} satf - The SATF or SASF formatted string content to parse.
 * @param {string[]} [globalVariables] - Optional. A list of predefined global variable names to be used
 * during the parsing of steps
 * @returns {Promise<ParsedSequence>} A Promise that resolves to an object containing the parsed header
 * and an array of sequence objects.
 * If the input string does not contain a top-level SATF structure recognized by the parser,
 * it resolves with a default empty ParsedSequence object (e.g., { header: "", sequences: [] }).
 */
export async function satfToSeqn(satf: string, globalVariables?: string[]): Promise<ParsedSeqn> {
  const base = SatfLanguage.parser.parse(satf).topNode;

  const satfNode = base.getChild(SATF_SASF_NODES.SATF);

  if (!satfNode) {
    return { metadata: '', sequences: [] };
  }

  const metadata = parseHeader(satfNode.getChild(SATF_SASF_NODES.HEADER), satf);
  const sequences = parseBody(satfNode.getChild(SATF_SASF_NODES.BODY), globalVariables, satf);
  return { metadata, sequences };
}

export async function sasfToSeqn(sasf: string, globalVariables?: string[]): Promise<ParsedSeqn> {
  const base = SatfLanguage.parser.parse(sasf).topNode;

  const sasfNode = base.getChild(SATF_SASF_NODES.SASF);

  if (!sasfNode) {
    return { metadata: '', sequences: [] };
  }

  const metadata = parseHeader(sasfNode.getChild(SATF_SASF_NODES.HEADER), sasf);
  const sequences = parseBody(sasfNode.getChild(SATF_SASF_NODES.BODY), globalVariables, sasf);
  return { metadata, sequences };
}

function parseHeader(headerNode: SyntaxNode | null, text: string): string {
  const header = '';
  if (!headerNode) {
    return header;
  }

  const sfduHeader =
    headerNode
      .getChild(SATF_SASF_NODES.SFDU_HEADER)
      ?.getChild(SATF_SASF_NODES.HEADER_PAIRS)
      ?.getChildren(SATF_SASF_NODES.HEADER_PAIR) ?? [];

  return sfduHeader
    .map((pairNode: SyntaxNode) => {
      const keyNode = pairNode.getChild(SATF_SASF_NODES.KEY);
      const valueNode = pairNode.getChild(SATF_SASF_NODES.VALUE);
      if (!keyNode || !valueNode) {
        console.error(`Error processing header entry: ${text.slice(pairNode.from, pairNode.to)}`);
        return '';
      }
      const key = text.slice(keyNode.from, keyNode.to).trim();
      const value = text.slice(valueNode.from, valueNode.to).trim();

      if (key.length === 0 || value.length === 0) {
        return '';
      }
      return `@METADATA "${key}" "${value}"`;
    })
    .join('\n');
}
function parseBody(bodyNode: SyntaxNode | null, globalVariables: string[] = [], text: string): Seqn[] {
  if (!bodyNode) {
    return [];
  }

  //satf
  if (bodyNode.getChild(SATF_SASF_NODES.ACTIVITY_TYPE_DEFINITIONS)) {
    const activityTypeNodes =
      bodyNode.getChild(SATF_SASF_NODES.ACTIVITY_TYPE_DEFINITIONS)?.getChildren(SATF_SASF_NODES.ACTIVITY_TYPE_GROUP) ??
      [];

    return activityTypeNodes.map((group, i) => {
      let sequenceName = 'sequence-' + i;
      const sequenceNameNode = group.getChild(SATF_SASF_NODES.ACTIVITY_TYPE_NAME);
      const seqGenNode = group.getChild(SATF_SASF_NODES.SEQGEN);
      const vcNode = group.getChild(SATF_SASF_NODES.VIRTUAL_CHANNEL);
      const onBoardFilenameNode = group.getChild(SATF_SASF_NODES.ON_BOARD_FILENAME);
      const onBoardFilePathNode = group.getChild(SATF_SASF_NODES.ON_BOARD_PATH);

      if (sequenceNameNode) {
        const name = text.slice(sequenceNameNode.from, sequenceNameNode.to);
        sequenceName = name.split('/').pop() || 'sequence-' + i;
      }

      const inputParameters = parseParameters(group.getChild(SATF_SASF_NODES.PARAMETERS), 'INPUT_PARAMS', text);
      const localVariables = parseParameters(group.getChild(SATF_SASF_NODES.VARIABLES), 'LOCALS', text);

      let metadata = '';
      if (vcNode) {
        metadata += `@METADATA "VIRTUAL_CHANNEL" "${text.slice(vcNode.from, vcNode.to)}"\n`;
      }
      if (onBoardFilenameNode) {
        metadata += `@METADATA "ON_BOARD_FILENAME" "${text.slice(onBoardFilenameNode.from, onBoardFilenameNode.to)}"\n`;
      }

      if (onBoardFilePathNode) {
        metadata += `@METADATA "ON_BOARD_PATH" "${text.slice(onBoardFilePathNode.from, onBoardFilePathNode.to)}"\n`;
      }
      if (seqGenNode) {
        metadata += `@METADATA "SEQGEN" "${text.slice(seqGenNode.from, seqGenNode.to)}"\n`;
      }
      metadata = metadata.trimEnd();

      const steps = parseSteps(
        group.getChild(SATF_SASF_NODES.STEPS),
        [
          ...parseVariableName(group.getChild(SATF_SASF_NODES.PARAMETERS), text),
          ...parseVariableName(group.getChild(SATF_SASF_NODES.VARIABLES), text),
          ...globalVariables,
        ],
        text,
      );

      return {
        name: sequenceName,
        metadata,
        inputParameters,
        localVariables,
        steps,
      };
    });
  }

  //sasf
  if (bodyNode.getChild(SATF_SASF_NODES.REQUESTS)) {
    const requestNodes = bodyNode.getChild(SATF_SASF_NODES.REQUESTS)?.getChildren(SATF_SASF_NODES.REQUEST) ?? [];

    return requestNodes.map((group, i) => {
      let requests = '';
      const requestNameNode = group.getChild(SATF_SASF_NODES.REQUEST_NAME);
      const requestorNode = group.getChild(SATF_SASF_NODES.REQUESTOR);
      const processorNode = group.getChild(SATF_SASF_NODES.PROCESSOR);
      const keyNode = group.getChild(SATF_SASF_NODES.KEY);
      const startTimeNode = group.getChild(SATF_SASF_NODES.START_TIME);
      const sequenceName = requestNameNode ? text.slice(requestNameNode.from, requestNameNode.to) : 'sequence-' + i;
      requests += parseTimeTagNode(
        startTimeNode ? startTimeNode.getChild(SATF_SASF_NODES.TIME) : null,
        startTimeNode ? startTimeNode.getChild(SATF_SASF_NODES.TIME_RELATION) : null,
        text,
      );
      requests += `@REQUEST_BEGIN("${sequenceName}")\n`;
      requests += parseSteps(group.getChild(SATF_SASF_NODES.STEPS), globalVariables, text)
        .split('\n')
        .map(line => ' '.repeat(2) + line)
        .join('\n');
      requests += `\n@REQUEST_END\n`;
      if (requestorNode) {
        requests += `@METADATA "REQUESTOR" "${removeQuote(text.slice(requestorNode.from, requestorNode.to))}"\n`;
      }
      if (processorNode) {
        requests += `@METADATA "PROCESSOR" "${removeQuote(text.slice(processorNode.from, processorNode.to))}"\n`;
      }
      if (keyNode) {
        requests += `@METADATA "KEY" "${removeQuote(text.slice(keyNode.from, keyNode.to))}"\n`;
      }

      return { name: sequenceName, requests };
    });
  }

  return [];
}

function parseVariableName(parameterNode: SyntaxNode | null, text: string): string[] {
  if (!parameterNode) {
    return [];
  }
  const entries = parameterNode.getChildren(SATF_SASF_NODES.ENTRY);
  if (!entries || entries.length === 0) {
    return [];
  }

  return entries.map(param => {
    const nameNode = param.getChild(SATF_SASF_NODES.NAME);
    return nameNode ? `${text.slice(nameNode.from, nameNode.to)}` : '';
  });
}

/** Mapping between SATF and SeqN from Taifun
  UNSIGNED_DECIMAL -> UINT
  SIGNED_DECIMAL -> INT
  HEXADECIMAL -> STRING
  OCTAL -> STRING
  BINARY -> STRING
  ENGINEERING -> FLOAT
  TIME -> STRING
  DURATION -> STRING
  STRING -> STRING | ENUM (if enum_name is defined)
  QUOATED_STRING -> STRING
  NOTE: HEXADECIMAL, OCTAL, BINARY are all uint in seqgen
 */
function parseParameters(
  parameterNode: SyntaxNode | null,
  variableType: 'INPUT_PARAMS' | 'LOCALS',
  text: string,
): string {
  if (!parameterNode) {
    return '';
  }
  const entries = parameterNode.getChildren(SATF_SASF_NODES.ENTRY);
  if (entries && entries.length > 0) {
    let parameter = `@${variableType}_BEGIN\n`;
    parameter += entries
      .map(param => {
        const nameNode = param.getChild(SATF_SASF_NODES.NAME);
        const typeNode = param.getChild(SATF_SASF_NODES.TYPE);
        const rangesNode = param.getChildren(SATF_SASF_NODES.RANGE);
        const enumNameNode = param.getChild(SATF_SASF_NODES.ENUM_NAME);

        const name = nameNode ? `${text.slice(nameNode.from, nameNode.to)}` : '';
        const enumName = enumNameNode ? ` ${text.slice(enumNameNode.from, enumNameNode.to)}` : '';
        let type = typeNode ? text.slice(typeNode.from, typeNode.to).trim() : '';
        switch (type) {
          case SATF_SASF_NODES.PARAM_UNSIGNED_DECIMAL:
            type = SEQN_NODES.VAR_UINT;
            break;
          case SATF_SASF_NODES.PARAM_SIGNED_DECIMAL:
            type = SEQN_NODES.VAR_INT;
            break;
          case SATF_SASF_NODES.PARAM_HEXADECIMAL:
          case SATF_SASF_NODES.PARAM_OCTAL:
          case SATF_SASF_NODES.PARAM_BINARY:
          case SATF_SASF_NODES.PARAM_TIME:
          case SATF_SASF_NODES.PARAM_DURATION:
          case SATF_SASF_NODES.PARAM_QUOTED_STRING:
            type = SEQN_NODES.VAR_STRING;
            break;
          case SATF_SASF_NODES.PARAM_ENGINEERING:
            type = SEQN_NODES.VAR_FLOAT;
            break;
          case SEQN_NODES.VAR_STRING:
            {
              // Always an enum matches the jpl_sequence tool
              //if (enumNameNode) {
              type = SEQN_NODES.VAR_ENUM;
              //} else {
              //  type = VAR_STRING;
              //}
            }
            break;
          default:
            console.log(`type: ${type} is not supported`);
        }

        const allowableValues: string[] = [];
        const allowableRanges: string[] = [];
        rangesNode.forEach((range: any) => {
          text
            .slice(range.from, range.to)
            .split(',')
            .forEach(r => {
              r = r.replaceAll('"', '').trim();
              if (r.includes('...')) {
                allowableRanges.push(r);
              } else {
                allowableValues.push(r);
              }
            });
        });

        return `${name} ${type}${enumName}${allowableRanges.length === 0 ? (allowableValues.length === 0 ? '' : ' ""') : ` "${allowableRanges.join(', ')}"`}${allowableValues.length === 0 ? '' : ` "${allowableValues.join(', ')}"`}`;
      })
      .join('\n');
    parameter += `\n@${variableType}_END`;

    return parameter;
  }
  return '';
}

function parseSteps(stepNode: SyntaxNode | null, variableNames: string[], text: string): string {
  const step = '';
  if (!stepNode) {
    return step;
  }

  const commandNodes = stepNode.getChildren(SATF_SASF_NODES.COMMAND);

  return commandNodes
    .map(command => {
      const time = parseTimeNode(command.getChild(SATF_SASF_NODES.SCHEDULED_TIME), text);
      const stem = parseStem(command.getChild(SATF_SASF_NODES.STEM), text);
      const comment = parseComment(command.getChild(SATF_SASF_NODES.COMMENT), text);
      const args = parseArgsNode(command.getChild(SATF_SASF_NODES.ARGS), variableNames, text);
      const models = parseModel(command.getChild(SATF_SASF_NODES.ASSUMED_MODEL_VALUES), text);
      const metadata = parseSatfCommandMetadata(command, text);

      //metadata
      return `${time}${stem}${args.length > 0 ? ` ${args}` : ''}${comment.length > 0 ? ` ${comment}` : ''}${metadata.length > 0 ? `\n${metadata}` : ''}${models.length > 0 ? `\n${models}` : ''}`;
    })
    .join('\n');
}

function parseTimeNode(timeNode: SyntaxNode | null, text: string): string {
  if (!timeNode) {
    return 'C ';
  }
  const timeValueNode = timeNode.getChild(SATF_SASF_NODES.TIME);
  const timeTagNode = timeNode.getChild(SATF_SASF_NODES.TIME_RELATION);

  return parseTimeTagNode(timeValueNode, timeTagNode, text);
}

function parseTimeTagNode(timeValueNode: SyntaxNode | null, timeTagNode: SyntaxNode | null, text: string) {
  if (timeValueNode && !timeTagNode) {
    return `A${text.slice(timeValueNode.from, timeValueNode.to)} `;
  } else if (!timeValueNode || !timeTagNode) {
    return `R00:00:00`;
  }

  const time = text.slice(timeValueNode.from, timeValueNode.to);
  const timeTag = text.slice(timeTagNode.from, timeTagNode.to);
  switch (timeTag.trim()) {
    case 'ABSOLUTE':
      return `A${time} `;
    case 'EPOCH':
      return `E${time} `;
    case 'FROM_PREVIOUS_START':
      return `R${time} `;
    case 'FROM_REQUEST_START':
    case 'FROM_ACTIVITY_START':
      return `B${time} `;
    case 'WAIT_PREVIOUS_END':
      return `C `;
    case 'GROUND_EPOCH':
      return `G${time} `;
    default:
      return 'error';
  }
}

function parseComment(commentNode: SyntaxNode | null, text: string): string {
  const comment = commentNode
    ? `${text
        .slice(commentNode.from, commentNode.to)
        .split('\n')
        .map(line => line.trim())
        .join(' ')
        .trim()}` // flatten comment to one line SeqN doesn't support multi-line comments on a command
    : '';

  if (comment.length === 0) {
    return comment;
  }
  return `# ${removeQuote(comment)}`;
}

function parseStem(stemNode: SyntaxNode | null, text: string): string {
  return stemNode ? text.slice(stemNode.from, stemNode.to) : '';
}

function parseArgsNode(argsNode: SyntaxNode | null, variableNames: string[], text: string): string {
  if (!argsNode) {
    return '';
  }
  let argNode = argsNode.firstChild;
  const args = [];
  while (argNode) {
    args.push(`${parseArgNode(argNode, variableNames, text)}`);
    argNode = argNode?.nextSibling;
  }
  return args.join(' ');
}

function parseArgNode(argNode: SyntaxNode, variableNames: string[], text: string): string {
  if (!argNode) {
    return '';
  }
  const argValue = removeQuote(text.slice(argNode.from, argNode.to));

  if (variableNames.includes(argValue)) {
    return argValue;
  }

  switch (argNode.name) {
    case SATF_SASF_NODES.STRING:
      return `"${argValue}"`;
    case SATF_SASF_NODES.NUMBER:
    case SATF_SASF_NODES.BOOLEAN:
    case SATF_SASF_NODES.ENUM:
    case SATF_SASF_NODES.GLOBAL:
      return `${argValue}`;
    case SATF_SASF_NODES.ARITHMETICAL:
      return `(${argValue})`;
    default: {
      console.log(`${argNode.name}: ${argValue} is not supported`);
      return 'Error';
    }
  }
}

function parsSeqNMetadata(node: SyntaxNode, text: string, filter: string[]): string | undefined {
  const metadataNode = node.getChild('Metadata');
  if (!metadataNode) {
    return undefined;
  }

  const metadataEntry = metadataNode.getChildren('MetaEntry');
  if (!metadataEntry || metadataEntry.length === 0) {
    return undefined;
  }

  const obj: string[] = [];
  metadataEntry.forEach(entry => {
    const keyNode = entry.getChild('Key');
    const valueNode = entry.getChild('Value');

    if (!keyNode || !valueNode) {
      return; // Skip this entry if either the key or value is missing
    }

    const keyText = unquoteUnescape(text.slice(keyNode.from, keyNode.to));
    if (!filter.includes(keyText)) {
      return;
    }

    let value = text.slice(valueNode.from, valueNode.to);
    try {
      value = JSON.parse(value);
    } catch (e) {
      console.log(`Malformed metadata ${value}`);
    }

    obj.push(`${keyText.toUpperCase()},\\${value}\\`);
  });

  return obj.join(`,\n${'\t'.repeat(2)}`);
}

function parseSatfCommandMetadata(commandNode: SyntaxNode | null, text: string) {
  let metadata = '';

  if (!commandNode) {
    return metadata;
  }

  const inclusionNode = commandNode.getChild(SATF_SASF_NODES.INCLUSION_CONDITION);
  const drawNode = commandNode.getChild(SATF_SASF_NODES.DRAW);
  const nTextNode = commandNode.getChild(SATF_SASF_NODES.NTEXT);

  if (inclusionNode) {
    metadata += `@METADATA "INCLUSION_CONDITION" "${removeQuote(text.slice(inclusionNode.from, inclusionNode.to))}"\n`;
  }

  if (drawNode) {
    metadata += `@METADATA "DRAW" "${removeQuote(text.slice(drawNode.from, drawNode.to))}"\n`;
  }

  if (nTextNode) {
    metadata += `@METADATA "NTEXT" "${removeQuote(text.slice(nTextNode.from, nTextNode.to))}"\n`;
  }
  return metadata.slice(0, -1);
}

function parseModel(modelNode: SyntaxNode | null, text: string): string {
  if (!modelNode) {
    return '';
  }
  const modelsNode = modelNode.getChildren(SATF_SASF_NODES.MODEL);
  return modelsNode
    .map(model => {
      const keyNode = model.getChild(SATF_SASF_NODES.KEY);
      const valueNode = model.getChild(SATF_SASF_NODES.VALUE);
      if (!keyNode || !valueNode) {
        return null;
      }
      return `@MODEL "${text.slice(keyNode.from, keyNode.to)}" ${text.slice(valueNode.from, valueNode.to)} "00:00:00"`;
    })
    .filter(model => model !== null)
    .join('\n');
}

function parseSeqNModel(node: SyntaxNode, text: string): string | undefined {
  const modelContainer = node.getChild('Models');
  if (!modelContainer) {
    return undefined;
  }

  const modelNodes = modelContainer.getChildren('Model');
  if (!modelNodes || modelNodes.length === 0) {
    return undefined;
  }

  const models = [];
  for (const modelNode of modelNodes) {
    const variableNode = modelNode.getChild('Variable');
    const valueNode = modelNode.getChild('Value');

    const variable = variableNode ? unquoteUnescape(text.slice(variableNode.from, variableNode.to)) : 'UNKNOWN';

    // Value can be string, number or boolean
    let value;
    const valueChild = valueNode?.firstChild;
    if (valueChild) {
      const valueText = text.slice(valueChild.from, valueChild.to);
      if (valueChild.name === 'String') {
        value = valueText;
      } else if (valueChild.name === 'Boolean') {
        value = !/^FALSE$/i.test(valueText);
      } else if (valueChild.name === 'Number') {
        value = Number(valueText);
      }
    }
    models.push(`${variable}=${value}`);
  }

  return models.join(',');
}
