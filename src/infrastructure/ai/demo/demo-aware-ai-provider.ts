import type { AiProvider } from '../../../application/ports/ai/ai-provider';
import type { AiOutputParser, AiRequest, AiResponse } from '../../../domain/ai/ai-contracts';
import type { OperationResult } from '../../../domain/shared/operation-error';

export class DemoAwareAiProvider implements AiProvider {
  public readonly id = 'codespeak-ai-router';

  public constructor(
    private readonly primary: AiProvider,
    private readonly demo: AiProvider,
    private readonly isDemoModeEnabled: () => boolean,
  ) {}

  public generate<TOutput>(
    request: AiRequest,
    outputParser: AiOutputParser<TOutput>,
    signal?: AbortSignal,
  ): Promise<OperationResult<AiResponse<TOutput>>> {
    return this.isDemoModeEnabled()
      ? this.demo.generate(request, outputParser, signal)
      : this.primary.generate(request, outputParser, signal);
  }
}
