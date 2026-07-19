import { describe, expect, it, vi } from 'vitest';
import type { AiProvider } from '../../../src/application/ports/ai/ai-provider';
import { VoiceIntentParser } from '../../../src/application/services/voice-intent-parser';
import { VoiceIntentResolver } from '../../../src/application/services/voice-intent-resolver';
import type { AiOutputParser, AiRequest, AiResponse } from '../../../src/domain/ai/ai-contracts';
import type { OperationResult } from '../../../src/domain/shared/operation-error';

class ClassificationAi implements AiProvider {
  public readonly id = 'test';
  public readonly generateCall = vi.fn();

  public constructor(private readonly output: unknown) {}

  public generate<TOutput>(
    request: AiRequest,
    parser: AiOutputParser<TOutput>,
  ): Promise<OperationResult<AiResponse<TOutput>>> {
    this.generateCall(request);
    const parsed = parser.parse(this.output);
    return Promise.resolve(
      parsed.ok ? { ok: true, value: { output: parsed.value, model: 'test' } } : parsed,
    );
  }
}

describe('VoiceIntentResolver', () => {
  it('uses deterministic aliases before asking AI', async () => {
    const ai = new ClassificationAi({ category: 'dictation', content: 'wrong' });
    const resolver = new VoiceIntentResolver(new VoiceIntentParser(), ai);

    const intent = await resolver.resolve('read line twenty six');

    expect(intent).toMatchObject({ name: 'read-line', parameters: { line: 26 } });
    expect(ai.generateCall).not.toHaveBeenCalled();
  });

  it('uses AI classification only after deterministic matching fails', async () => {
    const ai = new ClassificationAi({ category: 'dictation', content: 'Hello world' });
    const resolver = new VoiceIntentResolver(new VoiceIntentParser(), ai);

    const intent = await resolver.resolve('Hello world');

    expect(intent).toMatchObject({ name: 'dictation', parameters: { text: 'Hello world' } });
    expect(ai.generateCall).toHaveBeenCalledOnce();
  });

  it('routes AI classified Copilot requests to Copilot intent', async () => {
    const ai = new ClassificationAi({ category: 'copilot-chat', content: 'review this function' });
    const resolver = new VoiceIntentResolver(new VoiceIntentParser(), ai);

    await expect(resolver.resolve('could copilot review this')).resolves.toMatchObject({
      name: 'copilot-chat',
      parameters: { prompt: 'review this function' },
    });
  });
});
