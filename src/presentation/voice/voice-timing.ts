export interface VoiceTiming {
  readonly silenceTimeoutMilliseconds: number;
  readonly initialSpeechTimeoutMilliseconds: number;
}

export function resolveVoiceTiming(
  silenceTimeoutSeconds: number,
  initialSpeechTimeoutSeconds: number,
): VoiceTiming {
  return {
    silenceTimeoutMilliseconds: clamp(silenceTimeoutSeconds, 0.5, 10) * 1_000,
    initialSpeechTimeoutMilliseconds: clamp(initialSpeechTimeoutSeconds, 5, 60) * 1_000,
  };
}

function clamp(value: number, minimum: number, maximum: number): number {
  if (!Number.isFinite(value)) return minimum;
  return Math.min(maximum, Math.max(minimum, value));
}
