import type { VoiceIntent, VoiceIntentName } from '../../domain/speech/speech-contracts';
import {
  findCommandByVoiceAlias,
  normalizeVoiceText,
} from '../../presentation/commands/command-registry';

interface IntentRule {
  readonly name: VoiceIntentName;
  readonly phrases: readonly string[];
  readonly parameter?: 'instruction' | 'path' | 'line' | 'symbol';
  readonly requiresConfirmation: boolean;
}

const RULES: readonly IntentRule[] = [
  {
    name: 'go-to-line',
    phrases: ['go to line ', 'jump to line '],
    parameter: 'line',
    requiresConfirmation: false,
  },
  {
    name: 'open-file',
    phrases: ['open file ', 'open '],
    parameter: 'path',
    requiresConfirmation: false,
  },
  {
    name: 'read-current-function',
    phrases: ['read current function', 'summarize current function'],
    requiresConfirmation: false,
  },
  {
    name: 'find-symbol',
    phrases: ['find function ', 'find class ', 'find symbol '],
    parameter: 'symbol',
    requiresConfirmation: false,
  },
  {
    name: 'explain-selection',
    phrases: ['explain selected code', 'explain selection', 'explain this code'],
    requiresConfirmation: false,
  },
  {
    name: 'explain-diagnostic',
    phrases: ['explain current error', 'explain current diagnostic', 'explain error'],
    requiresConfirmation: false,
  },
  {
    name: 'summarize-file',
    phrases: ['summarize this file', 'summarize current file', 'read this file'],
    requiresConfirmation: false,
  },
  {
    name: 'check-accessibility',
    phrases: ['check accessibility', 'scan accessibility'],
    requiresConfirmation: false,
  },
  {
    name: 'start-focus-timer',
    phrases: ['start focus timer', 'start pomodoro'],
    requiresConfirmation: false,
  },
  { name: 'undo', phrases: ['undo', 'undo that'], requiresConfirmation: true },
  { name: 'redo', phrases: ['redo', 'redo that'], requiresConfirmation: true },
  {
    name: 'create-code',
    phrases: ['create code ', 'generate code ', 'write code ', 'create ', 'generate ', 'write '],
    parameter: 'instruction',
    requiresConfirmation: true,
  },
];

export class VoiceIntentParser {
  public parse(transcript: string): VoiceIntent {
    const spoken = transcript.trim();
    const normalized = normalizeVoiceText(spoken);

    const priorityIntent = this.priorityIntent(normalized);
    if (priorityIntent !== undefined) {
      return priorityIntent;
    }

    const registeredCommand = findCommandByVoiceAlias(normalized);
    if (registeredCommand !== undefined) {
      return {
        name: 'codespeak-command',
        parameters: { commandId: registeredCommand.id },
        confidence: 1,
        requiresConfirmation: registeredCommand.requiresConfirmation,
      };
    }

    const lineIntent = this.lineIntent(normalized);
    if (lineIntent !== undefined) {
      return lineIntent;
    }

    const copilot = normalized.match(/^(?:ask|tell|send) copilot(?: chat)?(?: to)? (.+)$/u);
    if (copilot?.[1] !== undefined) {
      return this.intent('copilot-chat', { prompt: copilot[1] });
    }
    if (normalized === 'open copilot chat' || normalized === 'ask copilot') {
      return this.intent('copilot-chat', { prompt: '' });
    }

    const commonNamedFolder = normalized.match(/^open the (.+) folder$/u);
    if (commonNamedFolder?.[1] !== undefined) {
      return this.intent('open-folder', { name: commonNamedFolder[1] }, true);
    }
    const folder = normalized.match(
      /^open (?:the )?(?:folder|project folder)(?: named)?(?: (.+))?$/u,
    );
    if (folder !== null) {
      return this.intent('open-folder', folder[1] === undefined ? {} : { name: folder[1] }, true);
    }

    if (normalized === 'open settings') {
      return this.intent('codespeak-command', { commandId: 'workbench.action.openSettings' });
    }

    const rename = normalized.match(/^rename (?:this|the current) (?:variable|symbol) to (.+)$/u);
    if (rename?.[1] !== undefined) {
      return this.intent('rename-symbol', { newName: rename[1] }, true);
    }

    if (/^(?:fix|quick fix) (?:the )?(?:current )?(?:error|diagnostic|line)$/u.test(normalized)) {
      return this.intent('quick-fix', {}, true);
    }

    const dictation = spoken.match(/^(?:type|dictate|insert text)\s+(.+)$/iu);
    if (dictation?.[1] !== undefined) {
      return this.intent('dictation', { text: dictation[1] });
    }

    const modification = normalized.match(
      /^(simplify|refactor|modify|change) (?:this|the selected) code(?: to)?(?: (.*))?$/u,
    );
    if (modification !== null) {
      return this.intent('modify-code', { instruction: spoken }, true);
    }

    for (const rule of RULES) {
      const phrase = rule.phrases.find(
        (candidate) => normalized === candidate.trimEnd() || normalized.startsWith(candidate),
      );
      if (phrase === undefined) {
        continue;
      }

      const value = spoken.slice(phrase.length).trim();
      if (rule.parameter !== undefined && value.length === 0) {
        continue;
      }

      return {
        name: rule.name,
        parameters:
          rule.parameter === undefined
            ? {}
            : { [rule.parameter]: this.normalizeParameter(rule.parameter, value) },
        confidence: 1,
        requiresConfirmation: rule.requiresConfirmation,
      };
    }

    return {
      name: 'unknown',
      parameters: { transcript: spoken },
      confidence: 0,
      requiresConfirmation: false,
    };
  }

  private priorityIntent(normalized: string): VoiceIntent | undefined {
    if (
      [
        'stop',
        'stop reading',
        'pause',
        'continue',
        'resume',
        'repeat that',
        'speak slower',
        'read slower',
        'speak faster',
        'read faster',
      ].includes(normalized)
    ) {
      return this.intent('speech-control', { action: normalized });
    }
    if (normalized === 'cancel' || normalized === 'cancel command') {
      return this.intent('cancel', {});
    }
    if (
      normalized === 'confirm' ||
      normalized === 'confirm action' ||
      normalized === 'confirm delete'
    ) {
      return this.intent('confirm', {});
    }
    return undefined;
  }

  private lineIntent(normalized: string): VoiceIntent | undefined {
    const rangeMatch = normalized.match(/^(?:read|explain) lines? (.+?) (?:to|through) (.+)$/u);
    if (rangeMatch?.[1] !== undefined && rangeMatch[2] !== undefined) {
      const start = parseSpokenNumber(rangeMatch[1]);
      const end = parseSpokenNumber(rangeMatch[2]);
      if (start !== undefined && end !== undefined) {
        return this.intent('read-line-range', {
          start,
          end,
          explain: normalized.startsWith('explain'),
        });
      }
    }
    const lineMatch = normalized.match(
      /^(?:(go to) )?(read|reed|explain|what is on) line(?: number)? (.+?)(?: and read it)?$/u,
    );
    if (lineMatch?.[3] !== undefined) {
      const line = parseSpokenNumber(lineMatch[3]);
      if (line !== undefined) {
        return this.intent('read-line', {
          line,
          move: lineMatch[1] !== undefined,
          explain: lineMatch[2] === 'explain',
        });
      }
    }
    return undefined;
  }

  private intent(
    name: VoiceIntentName,
    parameters: Readonly<Record<string, string | number | boolean>>,
    requiresConfirmation = false,
  ): VoiceIntent {
    return { name, parameters, confidence: 1, requiresConfirmation };
  }

  private normalizeParameter(
    parameter: 'instruction' | 'path' | 'line' | 'symbol',
    value: string,
  ): string | number {
    if (parameter !== 'line') {
      return value;
    }

    const numeric = Number.parseInt(value, 10);
    return Number.isSafeInteger(numeric) && numeric > 0 ? numeric : value;
  }
}

export function parseSpokenNumber(value: string): number | undefined {
  const normalized = normalizeVoiceText(value).replace(/-/gu, ' ');
  const numeric = Number.parseInt(normalized, 10);
  if (Number.isSafeInteger(numeric) && numeric > 0) return numeric;
  const units: Readonly<Record<string, number>> = {
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
    seven: 7,
    eight: 8,
    nine: 9,
    ten: 10,
    eleven: 11,
    twelve: 12,
    thirteen: 13,
    fourteen: 14,
    fifteen: 15,
    sixteen: 16,
    seventeen: 17,
    eighteen: 18,
    nineteen: 19,
  };
  const tens: Readonly<Record<string, number>> = {
    twenty: 20,
    thirty: 30,
    forty: 40,
    fifty: 50,
    sixty: 60,
    seventy: 70,
    eighty: 80,
    ninety: 90,
  };
  const words = normalized.split(' ');
  if (words.length === 1) return units[words[0] ?? ''] ?? tens[words[0] ?? ''];
  if (words.length === 2) {
    const tensValue = tens[words[0] ?? ''];
    const unitValue = units[words[1] ?? ''];
    if (tensValue !== undefined && unitValue !== undefined && unitValue < 10)
      return tensValue + unitValue;
  }
  return undefined;
}
