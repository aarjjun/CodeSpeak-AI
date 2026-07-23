import type { AiProvider } from '../../../application/ports/ai/ai-provider';
import type { PromptRepository } from '../../../application/ports/ai/prompt-repository';
import type { ConfigurationGateway } from '../../../application/ports/platform/configuration-gateway';
import type { Logger } from '../../../application/ports/platform/logger';
import type { SecretStore } from '../../../application/ports/persistence/persistence-ports';
import { SecretKeys } from '../../../config/secrets';
import type { AiOutputParser, AiRequest, AiResponse } from '../../../domain/ai/ai-contracts';
import type { OperationError, OperationResult } from '../../../domain/shared/operation-error';
import { composePromptContents } from '../prompts/compose-prompt-contents';

const SYSTEM_PROMPT_ID = 'system.accessibility';
const API_URL = 'https://api.openai.com/v1/responses';
const REQUEST_TIMEOUT_MILLISECONDS = 60_000;

export class OpenAiProvider implements AiProvider {
  public readonly id = 'openai';

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
      return this.failure('cancelled', 'The OpenAI request was cancelled.', true);
    }

    const apiKey = await this.secrets.get(SecretKeys.openAiApiKey);
    if (apiKey === undefined || apiKey.trim().length === 0) {
      return {
        ok: false,
        error: {
          code: 'configuration',
          message: 'Set an OpenAI API key before using the primary AI service.',
          retryable: true,
          recoveryActions: [
            {
              id: 'set-openai-api-key',
              label: 'Set OpenAI API Key',
              commandId: 'codespeak.setOpenAiApiKey',
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

      const model = this.configuration.get().openAiModel;
      const response = await this.requestOpenAi(
        apiKey,
        model,
        systemTemplate.render({}),
        composePromptContents(requestTemplate.render(request.input), request.context),
        request.capability,
        outputParser.jsonSchema,
        signal,
      );
      const responseText = this.extractResponseText(response);
      if (responseText === undefined || responseText.trim().length === 0) {
        return this.failure(
          'invalid-response',
          'OpenAI returned an empty or refused response.',
          true,
        );
      }

      let parsedJson: unknown;
      try {
        parsedJson = JSON.parse(responseText) as unknown;
      } catch {
        return this.failure(
          'invalid-response',
          'OpenAI returned a response that CodeSpeak could not read safely.',
          true,
        );
      }

      const parsedOutput = outputParser.parse(parsedJson);
      if (!parsedOutput.ok) {
        return {
          ok: false,
          error: {
            ...parsedOutput.error,
            message: 'OpenAI returned a response that CodeSpeak could not safely use.',
          },
        };
      }

      const usage = this.extractUsage(response);
      return {
        ok: true,
        value: {
          output: parsedOutput.value,
          model: this.getString(response, 'model') ?? model,
          ...(usage === undefined ? {} : { usage }),
        },
      };
    } catch (error: unknown) {
      const mappedError = this.mapError(error, signal);
      this.logger?.error('OpenAI request failed.', error, {
        capability: request.capability,
        model: this.configuration.get().openAiModel,
        errorCode: mappedError.code,
        retryable: mappedError.retryable,
        ...(error instanceof OpenAiHttpError ? { httpStatus: error.status } : {}),
      });
      return { ok: false, error: mappedError };
    }
  }

  private async requestOpenAi(
    apiKey: string,
    model: string,
    systemInstruction: string,
    contents: string,
    capability: AiRequest['capability'],
    responseJsonSchema: Readonly<Record<string, unknown>>,
    signal?: AbortSignal,
  ): Promise<unknown> {
    const normalizedModel = model.trim();
    if (normalizedModel.length === 0) {
      throw new OpenAiHttpError(400, 'The configured OpenAI model name is empty.');
    }
    const timeoutSignal = AbortSignal.timeout(REQUEST_TIMEOUT_MILLISECONDS);
    const requestSignal =
      signal === undefined ? timeoutSignal : AbortSignal.any([signal, timeoutSignal]);
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: normalizedModel,
        input: [
          { role: 'system', content: systemInstruction },
          { role: 'user', content: contents },
        ],
        text: {
          format: {
            type: 'json_schema',
            name: `codespeak_${capability.replaceAll('-', '_')}`,
            schema: responseJsonSchema,
            strict: true,
          },
        },
        max_output_tokens: 8_192,
        store: false,
      }),
      signal: requestSignal,
    });
    if (!response.ok) {
      throw new OpenAiHttpError(response.status, (await response.text()).slice(0, 2_000));
    }
    return response.json();
  }

  private extractResponseText(payload: unknown): string | undefined {
    const output = this.getArray(payload, 'output');
    for (const item of output ?? []) {
      if (this.getString(item, 'type') !== 'message') continue;
      for (const content of this.getArray(item, 'content') ?? []) {
        if (this.getString(content, 'type') === 'output_text') {
          return this.getString(content, 'text');
        }
        if (this.getString(content, 'type') === 'refusal') {
          return undefined;
        }
      }
    }
    return undefined;
  }

  private extractUsage(payload: unknown): AiResponse<unknown>['usage'] | undefined {
    const usage = this.getRecord(payload, 'usage');
    const inputTokens = this.getNumber(usage, 'input_tokens');
    const outputTokens = this.getNumber(usage, 'output_tokens');
    if (inputTokens === undefined && outputTokens === undefined) return undefined;
    return {
      ...(inputTokens === undefined ? {} : { inputTokens }),
      ...(outputTokens === undefined ? {} : { outputTokens }),
    };
  }

  private getRecord(value: unknown, key: string): Readonly<Record<string, unknown>> | undefined {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined;
    const nested = (value as Readonly<Record<string, unknown>>)[key];
    return typeof nested === 'object' && nested !== null && !Array.isArray(nested)
      ? (nested as Readonly<Record<string, unknown>>)
      : undefined;
  }

  private getArray(value: unknown, key: string): readonly unknown[] | undefined {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined;
    const nested = (value as Readonly<Record<string, unknown>>)[key];
    return Array.isArray(nested) ? nested : undefined;
  }

  private getString(value: unknown, key: string): string | undefined {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined;
    const nested = (value as Readonly<Record<string, unknown>>)[key];
    return typeof nested === 'string' ? nested : undefined;
  }

  private getNumber(value: unknown, key: string): number | undefined {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined;
    const nested = (value as Readonly<Record<string, unknown>>)[key];
    return typeof nested === 'number' ? nested : undefined;
  }

  private mapError(error: unknown, signal?: AbortSignal): OperationError {
    if (signal?.aborted === true || (error instanceof Error && error.name === 'AbortError')) {
      return {
        code: 'cancelled',
        message: 'The OpenAI request was cancelled.',
        retryable: true,
        recoveryActions: [],
      };
    }
    if (error instanceof OpenAiHttpError) {
      if (error.status === 401 || error.status === 403) {
        return {
          code: 'authentication',
          message: 'OpenAI rejected the saved API key. Check or replace the key.',
          retryable: true,
          recoveryActions: [
            {
              id: 'set-openai-api-key',
              label: 'Set OpenAI API Key',
              commandId: 'codespeak.setOpenAiApiKey',
            },
          ],
        };
      }
      if (error.status === 429) {
        return {
          code: 'rate-limited',
          message: 'The OpenAI rate limit was reached. Wait briefly and try again.',
          technicalMessage: error.message,
          retryable: true,
          recoveryActions: [],
        };
      }
      if (error.status === 408 || error.status >= 500) {
        return {
          code: 'provider-unavailable',
          message: 'OpenAI is temporarily unavailable. Try again shortly.',
          technicalMessage: error.message,
          retryable: true,
          recoveryActions: [],
        };
      }
      return {
        code: 'provider-unavailable',
        message: 'OpenAI could not complete the request. Check the selected model and try again.',
        technicalMessage: error.message,
        retryable: false,
        recoveryActions: [],
      };
    }
    if (error instanceof TypeError) {
      return {
        code: 'network-unavailable',
        message: 'CodeSpeak could not reach OpenAI. Check your internet connection.',
        technicalMessage: error.message,
        retryable: true,
        recoveryActions: [],
      };
    }
    if (error instanceof Error && error.name === 'TimeoutError') {
      return {
        code: 'provider-unavailable',
        message: 'The OpenAI request timed out. Try again with a smaller selection.',
        technicalMessage: error.message,
        retryable: true,
        recoveryActions: [],
      };
    }
    return {
      code: 'unexpected',
      message: 'An unexpected error occurred while contacting OpenAI.',
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

class OpenAiHttpError extends Error {
  public constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'OpenAiHttpError';
  }
}
