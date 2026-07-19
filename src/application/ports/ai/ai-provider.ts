import type { AiOutputParser, AiRequest, AiResponse } from '../../../domain/ai/ai-contracts';
import type { OperationResult } from '../../../domain/shared/operation-error';

export interface AiProvider {
  readonly id: string;

  generate<TOutput>(
    request: AiRequest,
    outputParser: AiOutputParser<TOutput>,
    signal?: AbortSignal,
  ): Promise<OperationResult<AiResponse<TOutput>>>;
}
