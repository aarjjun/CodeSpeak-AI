import type { AiProvider } from '../ports/ai/ai-provider';
import type { AiOutputParser, AiRequest } from '../../domain/ai/ai-contracts';
import type { OperationResult } from '../../domain/shared/operation-error';
import type { VoiceIntent } from '../../domain/speech/speech-contracts';
import type { VoiceIntentParser } from './voice-intent-parser';

type VoiceClassification =
  | 'code-generation'
  | 'code-editing'
  | 'explanation'
  | 'navigation'
  | 'read-aloud'
  | 'copilot-chat'
  | 'dictation'
  | 'unknown';

interface ClassifiedVoiceIntent {
  readonly category: VoiceClassification;
  readonly content: string;
}

const categories: readonly VoiceClassification[] = [
  'code-generation',
  'code-editing',
  'explanation',
  'navigation',
  'read-aloud',
  'copilot-chat',
  'dictation',
  'unknown',
];

const classifier: AiOutputParser<ClassifiedVoiceIntent> = {
  jsonSchema: {
    type: 'object',
    properties: {
      category: { type: 'string', enum: categories },
      content: { type: 'string' },
    },
    required: ['category', 'content'],
    additionalProperties: false,
  },
  parse(value: unknown): OperationResult<ClassifiedVoiceIntent> {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return invalid();
    const object = value as Readonly<Record<string, unknown>>;
    const category = object['category'];
    const content = object['content'];
    if (
      typeof category !== 'string' ||
      !categories.some((candidate) => candidate === category) ||
      typeof content !== 'string'
    ) {
      return invalid();
    }
    return { ok: true, value: { category: category as VoiceClassification, content } };
  },
};

export class VoiceIntentResolver {
  public constructor(
    private readonly deterministicParser: VoiceIntentParser,
    private readonly ai: AiProvider,
  ) {}

  public async resolve(transcript: string, signal?: AbortSignal): Promise<VoiceIntent> {
    const known = this.deterministicParser.parse(transcript);
    if (known.name !== 'unknown') return known;
    const request: AiRequest = {
      capability: 'chat',
      promptId: 'voice.classify',
      input: { transcript },
      context: [],
    };
    const result = await this.ai.generate(request, classifier, signal);
    if (!result.ok) return known;
    return this.toVoiceIntent(result.value.output, transcript);
  }

  private toVoiceIntent(classified: ClassifiedVoiceIntent, transcript: string): VoiceIntent {
    const content = classified.content.trim() || transcript.trim();
    switch (classified.category) {
      case 'code-generation':
        return intent('create-code', { instruction: content }, true);
      case 'code-editing':
        return intent('modify-code', { instruction: content }, true);
      case 'explanation':
        return intent('explain-selection', {});
      case 'read-aloud':
        return intent('codespeak-command', { commandId: 'codespeak.readSelectionContext' });
      case 'copilot-chat':
        return intent('copilot-chat', { prompt: content });
      case 'dictation':
        return intent('dictation', { text: content });
      case 'navigation':
      case 'unknown':
        return intent('unknown', { transcript });
    }
  }
}

function intent(
  name: VoiceIntent['name'],
  parameters: Readonly<Record<string, string | number | boolean>>,
  requiresConfirmation = false,
): VoiceIntent {
  return { name, parameters, confidence: 0.7, requiresConfirmation };
}

function invalid(): OperationResult<never> {
  return {
    ok: false,
    error: {
      code: 'invalid-response',
      message: 'The voice intent response was invalid.',
      retryable: true,
      recoveryActions: [],
    },
  };
}
