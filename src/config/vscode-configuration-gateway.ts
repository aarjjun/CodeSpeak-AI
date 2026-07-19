import * as vscode from 'vscode';
import type { AccessibilityProfileId } from '../domain/accessibility/accessibility-profile';
import type {
  CodeSpeakConfiguration,
  ConfigurationGateway,
} from '../application/ports/platform/configuration-gateway';

const SECTION = 'codespeak';
const DEFAULT_MODEL = 'gemini-3.5-flash';
const DEFAULT_LANGUAGE = 'en-US';
const DEFAULT_RATE = 1;
const DEFAULT_PROFILE: AccessibilityProfileId = 'custom';
const PROFILE_IDS: readonly AccessibilityProfileId[] = [
  'blind',
  'low-vision',
  'dyslexia',
  'motor',
  'adhd',
  'custom',
];

export class VsCodeConfigurationGateway implements ConfigurationGateway {
  public get(): CodeSpeakConfiguration {
    const configuration = vscode.workspace.getConfiguration(SECTION);
    const configuredRate = configuration.get<number>('voice.rate', DEFAULT_RATE);
    const configuredProfile = configuration.get<string>('accessibilityProfile', DEFAULT_PROFILE);

    return {
      model: configuration.get<string>('model', DEFAULT_MODEL),
      voiceLanguage: configuration.get<string>('voice.language', DEFAULT_LANGUAGE),
      voiceLanguageConfigured: this.isExplicitlyConfigured(configuration, 'voice.language'),
      voiceRate: Math.min(2, Math.max(0.5, configuredRate)),
      voiceRateConfigured: this.isExplicitlyConfigured(configuration, 'voice.rate'),
      voiceVolume: Math.min(100, Math.max(0, configuration.get<number>('voice.volume', 100))),
      ...this.optionalVoiceName(configuration),
      accessibilityProfile: this.isProfileId(configuredProfile)
        ? configuredProfile
        : DEFAULT_PROFILE,
      autoExplainErrors: configuration.get<boolean>('autoExplainErrors', false),
      autoReadSummaries: configuration.get<boolean>('autoReadSummaries', false),
      autoReadSummariesConfigured: this.isExplicitlyConfigured(configuration, 'autoReadSummaries'),
    };
  }

  private optionalVoiceName(
    configuration: vscode.WorkspaceConfiguration,
  ): Readonly<{ voiceName?: string }> {
    const voiceName = configuration.get<string>('voice.name', '').trim();
    return voiceName.length === 0 ? {} : { voiceName };
  }

  public onDidChange(listener: (configuration: CodeSpeakConfiguration) => void): () => void {
    const disposable = vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration(SECTION)) {
        listener(this.get());
      }
    });

    return () => {
      disposable.dispose();
    };
  }

  public async setAccessibilityProfile(profileId: AccessibilityProfileId): Promise<void> {
    await vscode.workspace
      .getConfiguration(SECTION)
      .update('accessibilityProfile', profileId, vscode.ConfigurationTarget.Global);
  }

  private isProfileId(value: string): value is AccessibilityProfileId {
    return PROFILE_IDS.some((profileId) => profileId === value);
  }

  private isExplicitlyConfigured(
    configuration: vscode.WorkspaceConfiguration,
    key: string,
  ): boolean {
    const inspection = configuration.inspect<unknown>(key);
    return (
      inspection?.globalValue !== undefined ||
      inspection?.workspaceValue !== undefined ||
      inspection?.workspaceFolderValue !== undefined ||
      inspection?.globalLanguageValue !== undefined ||
      inspection?.workspaceLanguageValue !== undefined ||
      inspection?.workspaceFolderLanguageValue !== undefined
    );
  }
}
