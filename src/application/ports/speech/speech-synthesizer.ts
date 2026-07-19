import type { OperationResult } from '../../../domain/shared/operation-error';
import type { SpeechSynthesisOptions } from '../../../domain/speech/speech-contracts';

export interface SpeechSynthesizer {
  speak(
    text: string,
    options: SpeechSynthesisOptions,
    signal?: AbortSignal,
  ): Promise<OperationResult<void>>;

  stop(): Promise<void>;
}
