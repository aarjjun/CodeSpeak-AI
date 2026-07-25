import * as vscode from 'vscode';
import type { ConfigurationGateway } from '../../application/ports/platform/configuration-gateway';
import type { Logger } from '../../application/ports/platform/logger';
import { profileSettingPreset } from './profile-setting-presets';
import { readDyslexiaSettings } from './dyslexia/dyslexia-settings';
import {
  planProfileSettingTransition,
  type ProfileSettingsState,
  type StoredSetting,
} from './dyslexia/settings-backup';

const STATE_KEY = 'codespeak.profileSettingsState.v2';

const EMPTY_STATE: ProfileSettingsState = { baseline: {}, applied: {} };

export class ProfileSettingsController implements vscode.Disposable {
  private applyQueue: Promise<void> = Promise.resolve();
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
    this.applyQueue = this.applyQueue
      .then(() => this.applyCurrentProfilePass())
      .catch((error: unknown) => {
        this.logger.error('Could not apply the accessibility profile settings.', error);
      });
    await this.applyQueue;
  }

  private async applyCurrentProfilePass(): Promise<void> {
    const stored = this.state.get<ProfileSettingsState>(STATE_KEY, EMPTY_STATE);
    const preset = profileSettingPreset(
      this.configuration.get().accessibilityProfile,
      readDyslexiaSettings(vscode.workspace.getConfiguration('codespeak.dyslexia')),
    );
    const keys = new Set([...Object.keys(stored.applied), ...Object.keys(preset)]);
    const current = Object.fromEntries(
      [...keys].map((key) => [key, this.readWorkspaceSetting(key)]),
    );
    const transition = planProfileSettingTransition(stored, current, preset);
    for (const write of transition.writes) {
      await this.updateWorkspaceSetting(write.key, write.value);
    }
    await this.state.update(STATE_KEY, transition.state);
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
