import { describe, expect, it, vi } from 'vitest';
import type { AiProvider } from '../../../src/application/ports/ai/ai-provider';
import type { AiOutputParser, AiRequest, AiResponse } from '../../../src/domain/ai/ai-contracts';
import type { OperationResult } from '../../../src/domain/shared/operation-error';
import { FallbackAiProvider } from '../../../src/infrastructure/ai/fallback/fallback-ai-provider';
import { generatedCodeParser } from '../../../src/infrastructure/ai/validation/ai-output-parsers';

const request: AiRequest = {
  capability: 'code-generation',
  promptId: 'code.generate',
  input: { instruction: 'Create a constant', languageId: 'typescript' },
  context: [],
};

function provider(
  result: Awaited<ReturnType<AiProvider['generate']>>,
  id: string,
): { readonly provider: AiProvider; readonly generate: ReturnType<typeof vi.fn> } {
  const generate = vi.fn();
  return {
    generate,
    provider: {
      id,
      generate: <TOutput>(
        requestValue: AiRequest,
        parser: AiOutputParser<TOutput>,
        signal?: AbortSignal,
      ) => {
        generate(requestValue, parser, signal);
        return Promise.resolve(result as OperationResult<AiResponse<TOutput>>);
      },
    },
  };
}

describe('FallbackAiProvider', () => {
  it('uses Gemini after an OpenAI rate limit and announces before sending', async () => {
    const openAi = provider(
      {
        ok: false,
        error: {
          code: 'rate-limited',
          message: 'OpenAI quota reached.',
          retryable: true,
          recoveryActions: [],
        },
      },
      'openai',
    );
    const gemini = provider(
      {
        ok: true,
        value: {
          output: {
            code: 'const answer = 42;',
            explanation: 'Creates a constant.',
            languageId: 'typescript',
          },
          model: 'gemini',
        },
      },
      'gemini',
    );
    const announce = vi.fn(() => Promise.resolve());
    const router = new FallbackAiProvider(openAi.provider, gemini.provider, announce);

    const result = await router.generate(request, generatedCodeParser);

    expect(result.ok).toBe(true);
    expect(announce).toHaveBeenCalledOnce();
    expect(gemini.generate).toHaveBeenCalledOnce();
    expect(announce.mock.invocationCallOrder[0]).toBeLessThan(
      gemini.generate.mock.invocationCallOrder[0] ?? Number.MAX_SAFE_INTEGER,
    );
  });

  it('does not call Gemini when OpenAI succeeds', async () => {
    const success = {
      ok: true as const,
      value: {
        output: {
          code: 'const answer = 42;',
          explanation: 'Creates a constant.',
          languageId: 'typescript',
        },
        model: 'gpt-5.6-sol',
      },
    };
    const openAi = provider(success, 'openai');
    const gemini = provider(success, 'gemini');
    const router = new FallbackAiProvider(openAi.provider, gemini.provider, vi.fn());

    const result = await router.generate(request, generatedCodeParser);

    expect(result.ok).toBe(true);
    expect(gemini.generate).not.toHaveBeenCalled();
  });

  it('keeps cancellation final instead of starting another provider request', async () => {
    const cancelled = {
      ok: false as const,
      error: {
        code: 'cancelled' as const,
        message: 'Cancelled.',
        retryable: true,
        recoveryActions: [],
      },
    };
    const openAi = provider(cancelled, 'openai');
    const gemini = provider(cancelled, 'gemini');
    const router = new FallbackAiProvider(openAi.provider, gemini.provider, vi.fn());

    const result = await router.generate(request, generatedCodeParser);

    expect(result).toEqual(cancelled);
    expect(gemini.generate).not.toHaveBeenCalled();
  });
});
