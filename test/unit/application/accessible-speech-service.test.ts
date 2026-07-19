import { describe, expect, it, vi } from 'vitest';
import type { ConfigurationGateway } from '../../../src/application/ports/platform/configuration-gateway';
import type { UserInterfaceGateway } from '../../../src/application/ports/platform/user-interface-gateway';
import type { SpeechSynthesizer } from '../../../src/application/ports/speech/speech-synthesizer';
import { AccessibleSpeechService } from '../../../src/application/services/accessible-speech-service';
import { AccessibilityProfileService } from '../../../src/application/services/accessibility-profile-service';
import { AccessibilityProfileCatalog } from '../../../src/domain/accessibility/accessibility-profile-catalog';

function configuration(): ConfigurationGateway {
  return {
    get: () => ({
      model: 'test',
      voiceLanguage: 'en-US',
      voiceLanguageConfigured: false,
      voiceRate: 1,
      voiceRateConfigured: false,
      voiceVolume: 80,
      accessibilityProfile: 'blind',
      autoExplainErrors: false,
      autoReadSummaries: true,
      autoReadSummariesConfigured: false,
    }),
    setAccessibilityProfile: () => Promise.resolve(),
    onDidChange: () => () => undefined,
  };
}

describe('AccessibleSpeechService', () => {
  it('interrupts current speech for critical messages and repeats the last message', async () => {
    const stop = vi.fn().mockResolvedValue(undefined);
    const speak = vi.fn().mockResolvedValue({ ok: true, value: undefined });
    const synthesizer: SpeechSynthesizer = { stop, speak };
    const announce = vi.fn().mockResolvedValue(undefined);
    const userInterface = {
      announce,
      showInformation: () => Promise.resolve(),
      showWarning: () => Promise.resolve(),
      showError: () => Promise.resolve(),
      choose: () => Promise.resolve(undefined),
      requestText: () => Promise.resolve(undefined),
      confirm: () => Promise.resolve(true),
      showProgress: <T>(_title: string, operation: (signal: AbortSignal) => Promise<T>) =>
        operation(new AbortController().signal),
    } satisfies UserInterfaceGateway;
    const settings = configuration();
    const service = new AccessibleSpeechService(
      synthesizer,
      new AccessibilityProfileService(settings, new AccessibilityProfileCatalog()),
      settings,
      userInterface,
    );

    await service.speak('Important error', 'critical');
    await service.repeat();

    expect(stop).toHaveBeenCalledOnce();
    expect(speak).toHaveBeenCalledTimes(2);
    expect(speak).toHaveBeenLastCalledWith(
      'Important error',
      expect.objectContaining({ rate: 1, volume: 80 }),
    );
    expect(announce).toHaveBeenCalledWith('Important error', 'assertive');
  });
});
