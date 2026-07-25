import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PromptRepository } from '../../../src/application/ports/ai/prompt-repository';
import type { ConfigurationGateway } from '../../../src/application/ports/platform/configuration-gateway';
import type { SecretStore } from '../../../src/application/ports/persistence/persistence-ports';
import { OpenAiProvider } from '../../../src/infrastructure/ai/openai/openai-provider';
import { generatedCodeParser } from '../../../src/infrastructure/ai/validation/ai-output-parsers';
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

describe('OpenAiProvider', () => {
  it('does not send a request when voice cancellation already aborted the signal', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const provider = new OpenAiProvider(secretStore('openai-test-key'), configuration, prompts);
    const controller = new AbortController();
    controller.abort();

    const result = await provider.generate(request, generatedCodeParser, controller.signal);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('cancelled');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns a secure key recovery action without making a request when no key exists', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const provider = new OpenAiProvider(secretStore(), configuration, prompts);

    const result = await provider.generate(request, generatedCodeParser);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('configuration');
      expect(result.error.recoveryActions[0]?.commandId).toBe('codespeak.setOpenAiApiKey');
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('uses Responses structured output without provider storage', async () => {
    let requestBody: Readonly<Record<string, unknown>> | undefined;
    let authorization: string | null = null;
    vi.stubGlobal(
      'fetch',
      vi.fn((_input: string | URL | Request, init?: RequestInit) => {
        requestBody =
          typeof init?.body === 'string'
            ? (JSON.parse(init.body) as Readonly<Record<string, unknown>>)
            : undefined;
        authorization = new Headers(init?.headers).get('Authorization');
        return Promise.resolve(
          new Response(
            JSON.stringify({
              model: 'gpt-5.6-sol',
              output: [
                {
                  type: 'message',
                  content: [
                    {
                      type: 'output_text',
                      text: JSON.stringify({
                        code: 'const answer = 42;',
                        explanation: 'Creates a constant.',
                        languageId: 'typescript',
                      }),
                    },
                  ],
                },
              ],
              usage: { input_tokens: 18, output_tokens: 9 },
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          ),
        );
      }),
    );
    const provider = new OpenAiProvider(secretStore('openai-test-key'), configuration, prompts);

    const result = await provider.generate(request, generatedCodeParser);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.model).toBe('gpt-5.6-sol');
      expect(result.value.usage).toEqual({ inputTokens: 18, outputTokens: 9 });
    }
    expect(authorization).toBe('Bearer openai-test-key');
    expect(requestBody).toMatchObject({
      model: 'gpt-5.6-sol',
      store: false,
      text: {
        format: {
          type: 'json_schema',
          strict: true,
        },
      },
    });
  });

  it('maps an OpenAI quota response to a rate limit error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response('Quota exceeded', { status: 429 }))),
    );
    const provider = new OpenAiProvider(secretStore('openai-test-key'), configuration, prompts);

    const result = await provider.generate(request, generatedCodeParser);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('rate-limited');
  });
});
