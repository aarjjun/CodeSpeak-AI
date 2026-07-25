import { describe, expect, it } from 'vitest';
import { VoiceCommandCancellation } from '../../../src/presentation/voice/voice-command-cancellation';

describe('VoiceCommandCancellation', () => {
  it('aborts the current voice operation', () => {
    const cancellation = new VoiceCommandCancellation();
    const signal = cancellation.begin();

    expect(cancellation.cancel()).toBe(true);
    expect(signal.aborted).toBe(true);
    expect(cancellation.cancel()).toBe(false);
  });

  it('replaces and aborts an unfinished operation when a new one begins', () => {
    const cancellation = new VoiceCommandCancellation();
    const first = cancellation.begin();
    const second = cancellation.begin();

    expect(first.aborted).toBe(true);
    expect(second.aborted).toBe(false);
    expect(cancellation.currentSignal).toBe(second);
  });

  it('only completes the matching operation', () => {
    const cancellation = new VoiceCommandCancellation();
    const first = cancellation.begin();
    const second = cancellation.begin();

    cancellation.complete(first);
    expect(cancellation.currentSignal).toBe(second);

    cancellation.complete(second);
    expect(cancellation.currentSignal).toBeUndefined();
  });
});
