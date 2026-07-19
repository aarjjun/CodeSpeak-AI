import { describe, expect, it } from 'vitest';
import { AccessibilityProfileService } from '../../../src/application/services/accessibility-profile-service';
import type { ConfigurationGateway } from '../../../src/application/ports/platform/configuration-gateway';
import { AccessibilityProfileCatalog } from '../../../src/domain/accessibility/accessibility-profile-catalog';

describe('AccessibilityProfileService', () => {
  it('applies explicit voice settings over profile defaults', () => {
    const configuration: ConfigurationGateway = {
      get: () => ({
        model: 'gemini-3.5-flash',
        voiceLanguage: 'en-IN',
        voiceLanguageConfigured: true,
        voiceRate: 1.25,
        voiceRateConfigured: true,
        accessibilityProfile: 'blind',
        autoExplainErrors: false,
        autoReadSummaries: false,
        autoReadSummariesConfigured: false,
      }),
      setAccessibilityProfile: () => Promise.resolve(),
      onDidChange: () => () => undefined,
    };
    const service = new AccessibilityProfileService(
      configuration,
      new AccessibilityProfileCatalog(),
    );

    const profile = service.current();

    expect(profile.id).toBe('blind');
    expect(profile.speech.language).toBe('en-IN');
    expect(profile.speech.rate).toBe(1.25);
    expect(profile.speech.autoReadSummaries).toBe(true);
  });
});
