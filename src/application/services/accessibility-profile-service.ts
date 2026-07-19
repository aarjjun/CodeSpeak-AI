import type { ConfigurationGateway } from '../ports/platform/configuration-gateway';
import type { AccessibilityProfile } from '../../domain/accessibility/accessibility-profile';
import type { AccessibilityProfileCatalog } from '../../domain/accessibility/accessibility-profile-catalog';

export class AccessibilityProfileService {
  public constructor(
    private readonly configuration: ConfigurationGateway,
    private readonly catalog: AccessibilityProfileCatalog,
  ) {}

  public current(): AccessibilityProfile {
    const settings = this.configuration.get();
    const profile = this.catalog.get(settings.accessibilityProfile);
    return {
      ...profile,
      speech: {
        ...profile.speech,
        rate: settings.voiceRateConfigured ? settings.voiceRate : profile.speech.rate,
        language: settings.voiceLanguageConfigured
          ? settings.voiceLanguage
          : profile.speech.language,
        autoReadSummaries: settings.autoReadSummariesConfigured
          ? settings.autoReadSummaries
          : profile.speech.autoReadSummaries,
      },
    };
  }
}
