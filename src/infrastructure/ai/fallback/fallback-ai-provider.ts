import type { AiProvider } from '../../../application/ports/ai/ai-provider';
import type { AiOutputParser, AiRequest, AiResponse } from '../../../domain/ai/ai-contracts';
import type {
  OperationError,
  OperationErrorCode,
  OperationResult,
} from '../../../domain/shared/operation-error';

const FALLBACK_ERROR_CODES: ReadonlySet<OperationErrorCode> = new Set([
  'configuration',
  'authentication',
  'network-unavailable',
  'rate-limited',
  'provider-unavailable',
  'parse-failure',
  'invalid-response',
  'unexpected',
]);

export class FallbackAiProvider implements AiProvider {
  public readonly id = 'codespeak-provider-fallback';

  public constructor(
    private readonly primary: AiProvider,
    private readonly fallback: AiProvider,
    private readonly announceFallback: (primaryError: OperationError) => Promise<void>,
  ) {}

  public async generate<TOutput>(
    request: AiRequest,
    outputParser: AiOutputParser<TOutput>,
    signal?: AbortSignal,
  ): Promise<OperationResult<AiResponse<TOutput>>> {
    const primaryResult = await this.primary.generate(request, outputParser, signal);
    if (primaryResult.ok || !FALLBACK_ERROR_CODES.has(primaryResult.error.code)) {
      return primaryResult;
    }

    await this.announceFallback(primaryResult.error);
    const fallbackResult = await this.fallback.generate(request, outputParser, signal);
    if (fallbackResult.ok) return fallbackResult;

    if (fallbackResult.error.code !== 'configuration') return fallbackResult;
    return {
      ok: false,
      error: {
        ...primaryResult.error,
        message: `${primaryResult.error.message} The optional fallback provider is not configured.`,
        recoveryActions: this.mergeRecoveryActions(
          primaryResult.error.recoveryActions,
          fallbackResult.error.recoveryActions,
        ),
      },
    };
  }

  private mergeRecoveryActions(
    primary: readonly OperationError['recoveryActions'][number][],
    fallback: readonly OperationError['recoveryActions'][number][],
  ): readonly OperationError['recoveryActions'][number][] {
    return [...primary, ...fallback].filter(
      (action, index, actions) =>
        actions.findIndex((candidate) => candidate.id === action.id) === index,
    );
  }
}
