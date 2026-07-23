import * as vscode from 'vscode';
import type { ConfigurationGateway } from '../../application/ports/platform/configuration-gateway';
import type { Logger } from '../../application/ports/platform/logger';
import { profileSettingPreset } from './profile-setting-presets';

const STATE_KEY = 'codespeak.profileSettingsState.v1';

interface StoredSetting {
  readonly exists: boolean;
  readonly value?: unknown;
}

interface ProfileSettingsState {
  readonly baseline: Readonly<Record<string, StoredSetting>>;
  readonly applied: Readonly<Record<string, unknown>>;
}

const EMPTY_STATE: ProfileSettingsState = { baseline: {}, applied: {} };

export class ProfileSettingsController implements vscode.Disposable {
  private applying = false;
  private readonly stopConfigurationListener: () => void;

  public constructor(
    private readonly configuration: ConfigurationGateway,
    private readonly state: vscode.Memento,
    private readonly logger: Logger,
  ) {
    this.stopConfigurationListener = this.configuration.onDidChange(() => {
      void this.applyCurrentProfile();
    });
    void this.applyCurrentProfile();
  }

  public async applyCurrentProfile(): Promise<void> {
    if (this.applying) return;
    this.applying = true;
    try {
      const stored = this.state.get<ProfileSettingsState>(STATE_KEY, EMPTY_STATE);
      const baseline: Record<string, StoredSetting> = { ...stored.baseline };
      await this.restoreAppliedSettings(stored.applied, baseline);

      const preset = profileSettingPreset(this.configuration.get().accessibilityProfile);
      const applied: Record<string, unknown> = {};
      for (const [fullKey, value] of Object.entries(preset)) {
        baseline[fullKey] = this.readWorkspaceSetting(fullKey);
        await this.updateWorkspaceSetting(fullKey, value);
        applied[fullKey] = value;
      }
      await this.state.update(STATE_KEY, { baseline, applied } satisfies ProfileSettingsState);
    } catch (error: unknown) {
      this.logger.error('Could not apply the accessibility profile settings.', error);
    } finally {
      this.applying = false;
    }
  }

  private async restoreAppliedSettings(
    applied: Readonly<Record<string, unknown>>,
    baseline: Record<string, StoredSetting>,
  ): Promise<void> {
    for (const [fullKey, appliedValue] of Object.entries(applied)) {
      const current = this.readWorkspaceSetting(fullKey);
      if (!settingsEqual(current.value, appliedValue) || !current.exists) {
        baseline[fullKey] = current;
        continue;
      }
      const original = baseline[fullKey] ?? { exists: false };
      await this.updateWorkspaceSetting(fullKey, original.exists ? original.value : undefined);
    }
  }

  private readWorkspaceSetting(fullKey: string): StoredSetting {
    const { section, key } = splitSettingKey(fullKey);
    const value = vscode.workspace.getConfiguration(section).inspect<unknown>(key)?.workspaceValue;
    return value === undefined ? { exists: false } : { exists: true, value };
  }

  private async updateWorkspaceSetting(fullKey: string, value: unknown): Promise<void> {
    const { section, key } = splitSettingKey(fullKey);
    await vscode.workspace
      .getConfiguration(section)
      .update(key, value, vscode.ConfigurationTarget.Workspace);
  }

  public dispose(): void {
    this.stopConfigurationListener();
  }
}

function splitSettingKey(fullKey: string): { readonly section: string; readonly key: string } {
  const separator = fullKey.indexOf('.');
  if (separator < 1 || separator === fullKey.length - 1) {
    throw new Error(`Invalid VS Code setting key: ${fullKey}`);
  }
  return { section: fullKey.slice(0, separator), key: fullKey.slice(separator + 1) };
}

function settingsEqual(first: unknown, second: unknown): boolean {
  return JSON.stringify(first) === JSON.stringify(second);
}
