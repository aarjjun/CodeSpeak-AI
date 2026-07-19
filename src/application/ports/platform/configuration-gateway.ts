import type { AccessibilityProfileId } from '../../../domain/accessibility/accessibility-profile';

export interface CodeSpeakConfiguration {
  readonly model: string;
  readonly voiceLanguage: string;
  readonly voiceLanguageConfigured: boolean;
  readonly voiceRate: number;
  readonly voiceRateConfigured: boolean;
  readonly voiceVolume?: number;
  readonly voiceName?: string;
  readonly accessibilityProfile: AccessibilityProfileId;
  readonly autoExplainErrors: boolean;
  readonly autoReadSummaries: boolean;
  readonly autoReadSummariesConfigured: boolean;
}

export interface ConfigurationGateway {
  get(): CodeSpeakConfiguration;
  setAccessibilityProfile(profileId: AccessibilityProfileId): Promise<void>;
  onDidChange(listener: (configuration: CodeSpeakConfiguration) => void): () => void;
}
