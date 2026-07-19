import type { AudioChunk, ListeningMode } from '../../../domain/speech/speech-contracts';

export interface AudioCapture {
  readonly available: boolean;

  start(
    mode: ListeningMode,
    onChunk: (chunk: AudioChunk) => void,
    signal?: AbortSignal,
  ): Promise<void>;

  stop(): Promise<void>;
}
