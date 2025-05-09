import type {
  Activate,
  Args,
  BooleanArgument,
  Command,
  Description,
  GroundBlock,
  GroundEvent,
  HexArgument,
  ImmediateActivate,
  ImmediateFswCommand,
  ImmediateLoad,
  Load,
  Metadata,
  Model,
  NumberArgument,
  Request,
  SeqJson,
  StringArgument,
  SymbolArgument,
  Time,
  VariableDeclaration,
} from '@nasa-jpl/seq-json-schema/types';
import { logError } from '../logger.js';
import { quoteEscape } from '../utils/string.js';

/**
 * Transform a sequence JSON time to it's sequence string form.
 */
function seqJsonTimeToSequence(time: Time): string {
  switch (time.type) {
    case 'ABSOLUTE':
      return `A${time.tag ?? ''}`;
    case 'COMMAND_COMPLETE':
      return 'C';
    case 'COMMAND_RELATIVE':
      return `R${time.tag ?? ''}`;
    case 'EPOCH_RELATIVE':
      return `E${time.tag ?? ''}`;
    case 'BLOCK_RELATIVE':
      return `B${time.tag ?? ''}`;
    default:
      return '';
  }
}

/**
 * Transform a base argument (non-repeat) into a string.
 */
function seqJsonBaseArgToSequence(
  arg: StringArgument | NumberArgument | BooleanArgument | SymbolArgument | HexArgument,
): string {
  switch (arg.type) {
    case 'string':
      return `${quoteEscape(arg.value)}`;
    default:
      return `${arg.value}`;
  }
}

function seqJsonArgsToSequence(args: Args): string {
  let result = '';

  for (const arg of args) {
    result += ' ';
    if (arg.type === 'repeat') {
      if (Array.isArray(arg.value)) {
        let repeatResult = '';
        for (const repeatArgSet of arg.value) {
          if (Array.isArray(repeatArgSet)) {
            for (const repeatArg of repeatArgSet) {
              repeatResult += ` ${seqJsonBaseArgToSequence(repeatArg)}`;
            }
            repeatResult = repeatResult.trim();
          } else {
            logError('Repeat arg set value is not an array');
          }
        }
        result += `[${repeatResult}]`;
      } else {
        logError('Repeat arg value is not an array');
      }
    } else {
      result += seqJsonBaseArgToSequence(arg);
    }
    result = result.trimEnd();
  }

  return result.trim().length > 0 ? ` ${result.trim()}` : '';
}

function seqJsonModelsToSequence(models: Model[]): string {
  // MODEL directives are one per line, the last new line is to start the next token
  const modelString = models
    .map(model => {
      let formattedValue: Model['value'] = model.value;
      if (typeof model.value === 'string') {
        formattedValue = quoteEscape(model.value);
      } else if (typeof model.value === 'boolean') {
        formattedValue = model.value.toString();
      }
      return `@MODEL ${typeof model.variable === 'string' ? quoteEscape(String(model.variable)) : `"${model.variable}"`} ${formattedValue} ${quoteEscape(model.offset)}`;
    })
    .join('\n');

  return modelString.length > 0 ? `${modelString}\n` : '';
}

function seqJsonMetadataToSequence(metadata: Metadata): string {
  // METADATA directives are one per line, the last new line is to start the next token
  const metaDataString = Object.entries(metadata)
    .map(
      ([key, value]: [key: string, value: unknown]) =>
        `@METADATA ${quoteEscape(key)} ${JSON.stringify(value, null, 2)}`,
    )
    .join('\n');
  return metaDataString.length > 0 ? `${metaDataString}\n` : '';
}

function seqJsonVariableToSequence(
  variables: [VariableDeclaration, ...VariableDeclaration[]],
  type: 'INPUT_PARAMS' | 'LOCALS',
): string {
  let sequence = `@${type}_BEGIN\n`;

  sequence += variables
    .map(variable => {
      const name = variable.name;
      const variableType = variable.type ? ` ${variable.type}` : '';
      const enumName = variable.enum_name ? ` ${variable.enum_name}` : '';
      const allowableRanges = variable.allowable_ranges
        ? ` "${variable.allowable_ranges.map(range => `${range.min}...${range.max}`).join(',')}"`
        : '';
      const allowableValues = variable.allowable_values
        ? ` ${allowableRanges.length === 0 ? '"" ' : ''}"${variable.allowable_values.map(value => `${value}`).join(',')}"`
        : '';
      return `${name}${variableType}${enumName}${allowableRanges}${allowableValues}`;
    })
    .join('\n');

  return sequence.trim() + `\n@${type}_END\n`;
}

function seqJsonDescriptionToSequence(description: Description): string {
  return ` # ${description}\n`;
}

/**
 * Transforms a sequence JSON to a sequence string.
 */
export function seqJsonToSeqn(seqJson: SeqJson): string {
  const sequence: string[] = [];

  // ID
  sequence.push(`@ID "${seqJson.id}"\n`);

  //input params
  if (seqJson.parameters) {
    sequence.push(seqJsonVariableToSequence(seqJson.parameters, 'INPUT_PARAMS'));
  }

  //locals
  if (seqJson.locals) {
    sequence.push(seqJsonVariableToSequence(seqJson.locals, 'LOCALS'));
  }

  if (seqJson.metadata) {
    // remove lgo from metadata if it exists
    sequence.push(
      seqJsonMetadataToSequence(
        Object.entries(seqJson.metadata)
          .filter(([key]) => key !== 'lgo')
          .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {}) as Metadata,
      ),
    );
  }

  // Load and Go
  if (seqJson.metadata.lgo) {
    sequence.push(`\n@LOAD_AND_GO`);
  }

  // command, activate, load, ground block, ground event
  if (seqJson.steps) {
    sequence.push(`\n`);
    for (const step of seqJson.steps) {
      switch (step.type) {
        case 'command': {
          // FSW Commands
          sequence.push(commandToString(step));
          break;
        }
        case 'activate':
        case 'load': {
          sequence.push(loadOrActivateToString(step));
          break;
        }
        case 'ground_block':
        case 'ground_event': {
          sequence.push(groundToString(step));
          break;
        }
      }
    }
  }

  // Immediate Commands
  if (seqJson.immediate_commands) {
    sequence.push(`\n`);
    sequence.push(`@IMMEDIATE\n`);
    for (const realTimeCommand of seqJson.immediate_commands) {
      switch (realTimeCommand.type) {
        case 'immediate_command': {
          // FSW Commands
          sequence.push(commandToString(realTimeCommand));
          break;
        }
        case 'immediate_activate':
        case 'immediate_load': {
          sequence.push(loadOrActivateToString(realTimeCommand));
          break;
        }
        default: {
          throw new Error(`Invalid immediate command type ${realTimeCommand.type}`);
        }
      }
    }
  }

  // hardware commands
  if (seqJson.hardware_commands) {
    sequence.push(`\n`);
    sequence.push(`@HARDWARE\n`);
    for (const hdw of seqJson.hardware_commands) {
      const description = hdw.description ? seqJsonDescriptionToSequence(hdw.description) : '';
      const metadata = hdw.metadata ? seqJsonMetadataToSequence(hdw.metadata) : '';
      let hardwareString = `${hdw.stem}${description}`;
      // add a new line if on doesn't exit at the end of the immediateString
      if (!hardwareString.endsWith('\n')) {
        hardwareString += '\n';
      }
      // Add metadata data if it exists
      hardwareString += metadata;
      sequence.push(hardwareString);
    }
  }

  // requests
  if (seqJson.requests) {
    for (const request of seqJson.requests) {
      sequence.push(`\n`);
      sequence.push(requestToString(request));
    }
  }

  return sequence.join('');
}

function isCommand(step: Command | ImmediateFswCommand): step is Command {
  return (step as Command).time !== undefined;
}

function commandToString(step: Command | ImmediateFswCommand): string {
  const args = seqJsonArgsToSequence(step.args);
  const metadata = step.metadata ? seqJsonMetadataToSequence(step.metadata) : '';
  const description = step.description ? seqJsonDescriptionToSequence(step.description) : '';

  // used for commands, ImmediateFswCommand doesn't support 'time' and 'models'
  let time = '';
  let models = '';
  if (isCommand(step)) {
    time = step.time ? `${seqJsonTimeToSequence(step.time)} ` : '';
    models = step.models ? (step.models ? seqJsonModelsToSequence(step.models) : '') : '';
  }

  let commandString = `${time}${step.stem}${args}${description}`;
  // add a new line if on doesn't exit at the end of the commandString
  if (!commandString.endsWith('\n')) {
    commandString += '\n';
  }
  // Add modeling data if it exists
  commandString += `${metadata}${models}`;
  return commandString;
}

function loadOrActivateToString(step: Activate | Load | ImmediateActivate | ImmediateLoad) {
  const time = (step as Activate | Load).time ? `${seqJsonTimeToSequence((step as Activate | Load).time)} ` : '';
  const args = step.args ? seqJsonArgsToSequence(step.args) : '';
  const metadata = step.metadata ? seqJsonMetadataToSequence(step.metadata) : '';
  const models = step.models ? seqJsonModelsToSequence(step.models) : '';
  const engine = step.engine !== undefined ? `@ENGINE ${step.engine.toString(10)}\n` : '';
  const epoch = step.epoch !== undefined ? `@EPOCH ${quoteEscape(step.epoch)}\n` : '';
  const description = step.description ? seqJsonDescriptionToSequence(step.description) : '';
  let stepType = '';
  switch (step.type) {
    case 'activate':
    case 'immediate_activate':
      stepType = '@ACTIVATE';
      break;
    case 'load':
    case 'immediate_load':
      stepType = '@LOAD';
      break;
  }
  stepType += `(${quoteEscape(step.sequence)})`;
  let stepString = `${time}${stepType}${args}${description}`;
  if (!stepString.endsWith('\n')) {
    stepString += '\n';
  }
  stepString += `${engine}${epoch}${metadata}${models}`;
  return stepString;
}

function groundToString(step: GroundBlock | GroundEvent) {
  const time = seqJsonTimeToSequence(step.time);
  const args = step.args ? seqJsonArgsToSequence(step.args) : '';
  const metadata = step.metadata ? seqJsonMetadataToSequence(step.metadata) : '';
  const models = step.models ? seqJsonModelsToSequence(step.models) : '';
  const description = step.description ? seqJsonDescriptionToSequence(step.description) : '';
  const stepType = `@${step.type === 'ground_block' ? 'GROUND_BLOCK' : 'GROUND_EVENT'}(${quoteEscape(step.name)})`;
  let stepString = `${time} ${stepType}${args}${description}`;
  if (!stepString.endsWith('\n')) {
    stepString += '\n';
  }
  stepString += `${metadata}${models}`;
  return stepString;
}

function requestToString(request: Request) {
  let time = '';
  if (request.time) {
    time = seqJsonTimeToSequence(request.time);
  } else if (request.ground_epoch) {
    time = `G${request.ground_epoch.delta ?? ''} ${quoteEscape(request.ground_epoch.name ?? '')}`;
  }
  const reqBegin = `@REQUEST_BEGIN(${quoteEscape(request.name)})`;
  const description = request.description ? seqJsonDescriptionToSequence(request.description) : '';
  let requestString = `${time} ${reqBegin}${description}`;
  if (!requestString.endsWith('\n')) {
    requestString += '\n';
  }
  const steps: string[] = [];
  for (const step of request.steps) {
    switch (step.type) {
      case 'command': {
        steps.push(commandToString(step));
        break;
      }
      case 'activate':
      case 'load': {
        steps.push(loadOrActivateToString(step));
        break;
      }
      case 'ground_block':
      case 'ground_event': {
        steps.push(groundToString(step));
        break;
      }
    }
  }
  const metadata = request.metadata ? seqJsonMetadataToSequence(request.metadata) : '';
  requestString += `${steps.join('')}@REQUEST_END\n${metadata}`;
  return requestString;
}
