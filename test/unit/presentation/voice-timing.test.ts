import { describe, expect, it } from 'vitest';
import { resolveVoiceTiming } from '../../../src/presentation/voice/voice-timing';

describe('resolveVoiceTiming', () => {
  it('supports a short post speech pause and a longer first speech window', () => {
    expect(resolveVoiceTiming(1.5, 12)).toEqual({
      silenceTimeoutMilliseconds: 1_500,
      initialSpeechTimeoutMilliseconds: 12_000,
    });
  });

  it('clamps unsafe timing values', () => {
    expect(resolveVoiceTiming(0, 2)).toEqual({
      silenceTimeoutMilliseconds: 500,
      initialSpeechTimeoutMilliseconds: 5_000,
    });
  });
});
