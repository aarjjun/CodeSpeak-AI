import { setTimeout as delay } from 'node:timers/promises';
import type { AiProvider } from '../../../application/ports/ai/ai-provider';
import type { PromptRepository } from '../../../application/ports/ai/prompt-repository';
import type { ConfigurationGateway } from '../../../application/ports/platform/configuration-gateway';
import type { SecretStore } from '../../../application/ports/persistence/persistence-ports';
import type {
  AiContextItem,
  AiOutputParser,
  AiRequest,
  AiResponse,
} from '../../../domain/ai/ai-contracts';
import type { OperationError, OperationResult } from '../../../domain/shared/operation-error';
import { SecretKeys } from '../../../config/secrets';
import type { Logger } from '../../../application/ports/platform/logger';

const SYSTEM_PROMPT_ID = 'system.accessibility';
const API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const MAXIMUM_CONTEXT_ITEMS = 20;
const MAXIMUM_CONTEXT_CHARACTERS = 80_000;
const MAXIMUM_ITEM_CHARACTERS = 30_000;
const MAXIMUM_ATTEMPTS = 2;
const REQUEST_TIMEOUT_MILLISECONDS = 30_000;

export class GeminiProvider implements AiProvider {
  public readonly id = 'gemini';

  public constructor(
    private readonly secrets: SecretStore,
    private readonly configuration: ConfigurationGateway,
    private readonly prompts: PromptRepository,
    private readonly logger?: Logger,
  ) {}

  public async generate<TOutput>(
    request: AiRequest,
    outputParser: AiOutputParser<TOutput>,
    signal?: AbortSignal,
  ): Promise<OperationResult<AiResponse<TOutput>>> {
    if (signal?.aborted === true) {
      return this.failure('cancelled', 'The Gemini request was cancelled.', true);
    }

    const apiKey = await this.secrets.get(SecretKeys.geminiApiKey);
    if (apiKey === undefined || apiKey.trim().length === 0) {
      return {
        ok: false,
        error: {
          code: 'configuration',
          message: 'Set a Gemini API key before using AI features.',
          retryable: true,
          recoveryActions: [
            {
              id: 'set-api-key',
              label: 'Set Gemini API Key',
              commandId: 'codespeak.setApiKey',
            },
          ],
        },
      };
    }

    try {
      const [systemTemplate, requestTemplate] = await Promise.all([
        this.prompts.get(SYSTEM_PROMPT_ID),
        this.prompts.get(request.promptId),
      ]);
      if (systemTemplate === undefined || requestTemplate === undefined) {
        return this.failure(
          'configuration',
          'A required CodeSpeak prompt template is unavailable.',
          false,
        );
      }

      const model = request.model ?? this.configuration.get().model;
      const payload = await this.requestGemini(
        model,
        apiKey,
        systemTemplate.render({}),
        this.composeContents(requestTemplate.render(request.input), request.context),
        outputParser.jsonSchema,
        signal,
      );
      const responseText = this.extractResponseText(payload);
      if (responseText === undefined || responseText.trim().length === 0) {
        return this.failure(
          'invalid-response',
          'Gemini returned an empty response. Try the request again.',
          true,
        );
      }

      let parsedJson: unknown;
      try {
        parsedJson = JSON.parse(responseText) as unknown;
      } catch {
        return this.failure(
          'invalid-response',
          'Gemini returned a response that CodeSpeak could not read safely.',
          true,
        );
      }

      const parsedOutput = outputParser.parse(parsedJson);
      if (!parsedOutput.ok) {
        return parsedOutput;
      }

      const usage = this.extractUsage(payload);
      return {
        ok: true,
        value: {
          output: parsedOutput.value,
          model: this.getString(payload, 'modelVersion') ?? model,
          ...(usage === undefined ? {} : { usage }),
        },
      };
    } catch (error: unknown) {
      const mappedError = this.mapError(error, signal);
      this.logger?.error('Gemini request failed.', error, {
        capability: request.capability,
        model: request.model ?? this.configuration.get().model,
        errorCode: mappedError.code,
        retryable: mappedError.retryable,
        ...(error instanceof GeminiHttpError ? { httpStatus: error.status } : {}),
      });
      return { ok: false, error: mappedError };
    }
  }

  private async requestGemini(
    model: string,
    apiKey: string,
    systemInstruction: string,
    contents: string,
    responseJsonSchema: Readonly<Record<string, unknown>>,
    signal?: AbortSignal,
  ): Promise<unknown> {
    const normalizedModel = model.replace(/^models\//u, '').trim();
    if (normalizedModel.length === 0) {
      throw new GeminiHttpError(400, 'The configured model name is empty.');
    }
    const url = `${API_BASE_URL}/${encodeURIComponent(normalizedModel)}:generateContent`;
    const body = JSON.stringify({
      systemInstruction: { parts: [{ text: systemInstruction }] },
      contents: [{ role: 'user', parts: [{ text: contents }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseJsonSchema,
        temperature: 0.2,
        maxOutputTokens: 8_192,
      },
      store: false,
    });

    for (let attempt = 1; attempt <= MAXIMUM_ATTEMPTS; attempt += 1) {
      try {
        const timeoutSignal = AbortSignal.timeout(REQUEST_TIMEOUT_MILLISECONDS);
        const requestSignal =
          signal === undefined ? timeoutSignal : AbortSignal.any([signal, timeoutSignal]);
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
          },
          body,
          signal: requestSignal,
        });
        if (response.ok) {
          return await response.json();
        }

        const technicalMessage = (await response.text()).slice(0, 2_000);
        if (!this.isRetryableStatus(response.status) || attempt === MAXIMUM_ATTEMPTS) {
          throw new GeminiHttpError(response.status, technicalMessage);
        }
      } catch (error: unknown) {
        if (signal?.aborted === true || (error instanceof Error && error.name === 'AbortError')) {
          throw error;
        }
        if (
          error instanceof GeminiHttpError &&
          (!this.isRetryableStatus(error.status) || attempt === MAXIMUM_ATTEMPTS)
        ) {
          throw error;
        }
        if (attempt === MAXIMUM_ATTEMPTS) {
          throw error;
        }
      }

      const backoffMilliseconds = 500 * 2 ** (attempt - 1) + Math.floor(Math.random() * 250);
      if (signal === undefined) {
        await delay(backoffMilliseconds);
      } else {
        await delay(backoffMilliseconds, undefined, { signal });
      }
    }

    throw new GeminiHttpError(503, 'Gemini retry attempts were exhausted.');
  }

  private composeContents(prompt: string, context: readonly AiContextItem[]): string {
    const blocks: string[] = [prompt.trim()];
    let remainingCharacters = MAXIMUM_CONTEXT_CHARACTERS;

    for (const [index, item] of context.slice(0, MAXIMUM_CONTEXT_ITEMS).entries()) {
      if (remainingCharacters <= 0) {
        break;
      }
      const content = item.content.slice(0, Math.min(MAXIMUM_ITEM_CHARACTERS, remainingCharacters));
      remainingCharacters -= content.length;
      blocks.push(
        [
          `<codespeak-context index="${(index + 1).toString()}" kind="${item.kind}">`,
          content,
          '</codespeak-context>',
        ].join('\n'),
      );
    }
    return blocks.join('\n\n');
  }

  private extractResponseText(payload: unknown): string | undefined {
    const candidates = this.getArray(payload, 'candidates');
    const candidate = candidates?.[0];
    const content = this.getRecord(candidate, 'content');
    const parts = this.getArray(content, 'parts');
    return parts
      ?.map((part) => this.getString(part, 'text'))
      .filter((text): text is string => text !== undefined)
      .join('');
  }

  private extractUsage(payload: unknown): AiResponse<unknown>['usage'] | undefined {
    const metadata = this.getRecord(payload, 'usageMetadata');
    if (metadata === undefined) {
      return undefined;
    }
    const inputTokens = this.getNumber(metadata, 'promptTokenCount');
    const outputTokens = this.getNumber(metadata, 'candidatesTokenCount');
    if (inputTokens === undefined && outputTokens === undefined) {
      return undefined;
    }
    return {
      ...(inputTokens === undefined ? {} : { inputTokens }),
      ...(outputTokens === undefined ? {} : { outputTokens }),
    };
  }

  private getRecord(value: unknown, key: string): Readonly<Record<string, unknown>> | undefined {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return undefined;
    }
    const nested = (value as Readonly<Record<string, unknown>>)[key];
    return typeof nested === 'object' && nested !== null && !Array.isArray(nested)
      ? (nested as Readonly<Record<string, unknown>>)
      : undefined;
  }

  private getArray(value: unknown, key: string): readonly unknown[] | undefined {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return undefined;
    }
    const nested = (value as Readonly<Record<string, unknown>>)[key];
    return Array.isArray(nested) ? nested : undefined;
  }

  private getString(value: unknown, key: string): string | undefined {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return undefined;
    }
    const nested = (value as Readonly<Record<string, unknown>>)[key];
    return typeof nested === 'string' ? nested : undefined;
  }

  private getNumber(value: unknown, key: string): number | undefined {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return undefined;
    }
    const nested = (value as Readonly<Record<string, unknown>>)[key];
    return typeof nested === 'number' ? nested : undefined;
  }

  private isRetryableStatus(status: number): boolean {
    return status === 408 || status >= 500;
  }

  private mapError(error: unknown, signal?: AbortSignal): OperationError {
    if (signal?.aborted === true || (error instanceof Error && error.name === 'AbortError')) {
      return {
        code: 'cancelled',
        message: 'The Gemini request was cancelled.',
        retryable: true,
        recoveryActions: [],
      };
    }
    if (error instanceof GeminiHttpError) {
      if (error.status === 401 || error.status === 403) {
        return {
          code: 'authentication',
          message: 'Gemini rejected the saved API key. Check or replace the key.',
          retryable: true,
          recoveryActions: [
            {
              id: 'set-api-key',
              label: 'Set Gemini API Key',
              commandId: 'codespeak.setApiKey',
            },
          ],
        };
      }
      if (error.status === 429) {
        return {
          code: 'rate-limited',
          message: 'The Gemini rate limit was reached. Wait briefly and try again.',
          technicalMessage: error.message,
          retryable: true,
          recoveryActions: [],
        };
      }
      if (error.status === 408) {
        return {
          code: 'provider-unavailable',
          message: 'The Gemini request timed out. Try again with a smaller request.',
          technicalMessage: error.message,
          retryable: true,
          recoveryActions: [],
        };
      }
      if (error.status >= 500) {
        return {
          code: 'provider-unavailable',
          message: `Gemini is temporarily unavailable. The service returned HTTP ${String(error.status)}. Try again shortly.`,
          technicalMessage: error.message,
          retryable: true,
          recoveryActions: [],
        };
      }
      return {
        code: 'provider-unavailable',
        message: 'Gemini could not complete the request. Check the selected model and try again.',
        technicalMessage: error.message,
        retryable: false,
        recoveryActions: [],
      };
    }
    if (error instanceof TypeError) {
      return {
        code: 'network-unavailable',
        message: 'CodeSpeak could not reach Gemini. Check your internet connection.',
        technicalMessage: error.message,
        retryable: true,
        recoveryActions: [],
      };
    }
    if (error instanceof Error && error.name === 'TimeoutError') {
      return {
        code: 'provider-unavailable',
        message: 'The Gemini request timed out. Try again with a smaller selection.',
        technicalMessage: error.message,
        retryable: true,
        recoveryActions: [],
      };
    }
    return {
      code: 'unexpected',
      message: 'An unexpected error occurred while contacting Gemini.',
      ...(error instanceof Error ? { technicalMessage: error.message } : {}),
      retryable: true,
      recoveryActions: [],
    };
  }

  private failure(
    code: OperationError['code'],
    message: string,
    retryable: boolean,
  ): OperationResult<never> {
    return {
      ok: false,
      error: { code, message, retryable, recoveryActions: [] },
    };
  }
}

class GeminiHttpError extends Error {
  public constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'GeminiHttpError';
  }
}
