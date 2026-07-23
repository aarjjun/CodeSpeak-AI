import { afterEach, describe, expect, it, vi } from 'vitest';
import { GeminiProvider } from '../../../src/infrastructure/ai/gemini/gemini-provider';
import { generatedCodeParser } from '../../../src/infrastructure/ai/validation/ai-output-parsers';
import type { PromptRepository } from '../../../src/application/ports/ai/prompt-repository';
import type { ConfigurationGateway } from '../../../src/application/ports/platform/configuration-gateway';
import type { Logger } from '../../../src/application/ports/platform/logger';
import type { SecretStore } from '../../../src/application/ports/persistence/persistence-ports';
import type { AiRequest, PromptVariables } from '../../../src/domain/ai/ai-contracts';

const request: AiRequest = {
  capability: 'code-generation',
  promptId: 'code.generate',
  input: { instruction: 'Create a constant', languageId: 'typescript' },
  context: [],
};

const prompts: PromptRepository = {
  get: (promptId) =>
    Promise.resolve({
      id: promptId,
      version: 1,
      render: (input: PromptVariables) => JSON.stringify(input),
    }),
};

const configuration: ConfigurationGateway = {
  get: () => ({
    model: 'gemini-3.5-flash',
    openAiModel: 'gpt-5.6-sol',
    voiceLanguage: 'en-US',
    voiceLanguageConfigured: false,
    voiceRate: 1,
    voiceRateConfigured: false,
    accessibilityProfile: 'custom',
    autoExplainErrors: false,
    autoReadSummaries: false,
    autoReadSummariesConfigured: false,
  }),
  setAccessibilityProfile: () => Promise.resolve(),
  onDidChange: () => () => undefined,
};

function secretStore(apiKey?: string): SecretStore {
  return {
    get: () => Promise.resolve(apiKey),
    set: () => Promise.resolve(),
    delete: () => Promise.resolve(),
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('GeminiProvider', () => {
  it('returns a recoverable configuration error without making a request when no key exists', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const provider = new GeminiProvider(secretStore(), configuration, prompts);

    const result = await provider.generate(request, generatedCodeParser);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('configuration');
      expect(result.error.recoveryActions[0]?.commandId).toBe('codespeak.setApiKey');
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('validates a structured REST response and disables provider-side storage', async () => {
    let requestBody: unknown;
    const fetchMock = vi.fn((_input: string | URL | Request, init?: RequestInit) => {
      if (typeof init?.body !== 'string') {
        return Promise.reject(new Error('Expected a JSON request body.'));
      }
      requestBody = JSON.parse(init.body) as unknown;
      return Promise.resolve(
        new Response(
          JSON.stringify({
            modelVersion: 'gemini-3.5-flash-001',
            candidates: [
              {
                content: {
                  parts: [
                    {
                      text: JSON.stringify({
                        code: 'const answer = 42;',
                        explanation: 'Creates a constant.',
                        languageId: 'typescript',
                      }),
                    },
                  ],
                },
              },
            ],
            usageMetadata: { promptTokenCount: 20, candidatesTokenCount: 10 },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      );
    });
    vi.stubGlobal('fetch', fetchMock);
    const provider = new GeminiProvider(secretStore('test-key'), configuration, prompts);

    const result = await provider.generate(request, generatedCodeParser);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.model).toBe('gemini-3.5-flash-001');
      expect(result.value.usage).toEqual({ inputTokens: 20, outputTokens: 10 });
    }
    expect(requestBody).toMatchObject({ store: false });
  });

  it('reports and logs the exact Gemini server status after retries', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response('Service unavailable', { status: 503 }))),
    );
    const logError = vi.fn();
    const logger: Logger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: logError,
    };
    const provider = new GeminiProvider(secretStore('test-key'), configuration, prompts, logger);

    const result = await provider.generate(request, generatedCodeParser);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain('HTTP 503');
    }
    expect(logError).toHaveBeenCalledWith(
      'Gemini request failed.',
      expect.any(Error),
      expect.objectContaining({ httpStatus: 503, model: 'gemini-3.5-flash' }),
    );
  });

  it('reports a rate limit immediately without retrying the same request', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(new Response('Quota exceeded', { status: 429 })));
    vi.stubGlobal('fetch', fetchMock);
    const provider = new GeminiProvider(secretStore('test-key'), configuration, prompts);

    const result = await provider.generate(request, generatedCodeParser);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('rate-limited');
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});
