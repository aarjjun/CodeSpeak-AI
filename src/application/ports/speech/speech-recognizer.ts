import type {
  AudioChunk,
  SpeechRecognitionOptions,
  SpeechTranscript,
} from '../../../domain/speech/speech-contracts';
import type { OperationResult } from '../../../domain/shared/operation-error';

export interface SpeechRecognizer {
  recognize(
    audio: AsyncIterable<AudioChunk>,
    options: SpeechRecognitionOptions,
    signal?: AbortSignal,
  ): AsyncIterable<OperationResult<SpeechTranscript>>;
}
