import type { VoiceIntent, VoiceIntentName } from '../../domain/speech/speech-contracts';

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
    const normalized = spoken.toLocaleLowerCase();

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
