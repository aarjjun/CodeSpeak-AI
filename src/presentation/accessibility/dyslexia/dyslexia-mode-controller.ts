import * as vscode from 'vscode';
import type { StateStore } from '../../../application/ports/persistence/persistence-ports';
import type { ConfigurationGateway } from '../../../application/ports/platform/configuration-gateway';
import type { UserInterfaceGateway } from '../../../application/ports/platform/user-interface-gateway';
import type { AccessibilityProfileId } from '../../../domain/accessibility/accessibility-profile';

const PREVIOUS_PROFILE_KEY = 'codespeak.dyslexia.previousProfile';
const FONT_NOTICE_KEY = 'codespeak.dyslexia.fontNoticeShown';

export class DyslexiaModeController implements vscode.Disposable {
  private readonly status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 91);
  private readonly stopConfigurationListener: () => void;
  private lastProfile: AccessibilityProfileId;

  public constructor(
    private readonly configuration: ConfigurationGateway,
    private readonly state: StateStore,
    private readonly userInterface: UserInterfaceGateway,
  ) {
    this.lastProfile = configuration.get().accessibilityProfile;
    this.status.name = 'CodeSpeak Dyslexia Mode';
    this.status.text = '$(book) CodeSpeak: Dyslexia Mode';
    this.status.command = 'codespeak.toggleDyslexiaMode';
    this.status.tooltip = 'Dyslexia Mode is active. Select to disable it.';
    this.status.accessibilityInformation = {
      label: 'CodeSpeak Dyslexia Mode is active. Select to disable it.',
      role: 'button',
    };
    this.stopConfigurationListener = configuration.onDidChange(() => {
      void this.synchronize();
    });
    void this.synchronize();
  }

  public async toggle(): Promise<void> {
    if (this.configuration.get().accessibilityProfile === 'dyslexia') {
      await this.disable();
      return;
    }
    await this.enable();
  }

  public async setEnabled(enabled: boolean): Promise<void> {
    const active = this.configuration.get().accessibilityProfile === 'dyslexia';
    if (active === enabled) {
      await this.userInterface.announce(
        `CodeSpeak Dyslexia Mode is already ${enabled ? 'enabled' : 'disabled'}.`,
      );
      return;
    }
    if (enabled) await this.enable();
    else await this.disable();
  }

  private async enable(): Promise<void> {
    const current = this.configuration.get().accessibilityProfile;
    await this.state.set(PREVIOUS_PROFILE_KEY, current);
    await vscode.workspace
      .getConfiguration('codespeak.dyslexia')
      .update('enabled', true, vscode.ConfigurationTarget.Global);
    await this.configuration.setAccessibilityProfile('dyslexia');
    this.status.show();
    await this.userInterface.showInformation('CodeSpeak Dyslexia Mode enabled.');
    if (!this.state.get<boolean>(FONT_NOTICE_KEY, false)) {
      await this.state.set(FONT_NOTICE_KEY, true);
      await this.userInterface.showInformation(
        'CodeSpeak cannot verify installed fonts. The selected font will use safe fallbacks if it is unavailable. Run Configure Dyslexia Font for setup.',
      );
    }
  }

  private async disable(): Promise<void> {
    const previous = this.state.get<AccessibilityProfileId>(PREVIOUS_PROFILE_KEY, 'custom');
    await vscode.workspace
      .getConfiguration('codespeak.dyslexia')
      .update('enabled', false, vscode.ConfigurationTarget.Global);
    await this.configuration.setAccessibilityProfile(previous === 'dyslexia' ? 'custom' : previous);
    this.status.hide();
    await this.userInterface.showInformation(
      'CodeSpeak Dyslexia Mode disabled. Previous editor settings restored.',
    );
  }

  private async synchronize(): Promise<void> {
    const profile = this.configuration.get().accessibilityProfile;
    if (profile === 'dyslexia' && this.lastProfile !== 'dyslexia') {
      await this.state.set(PREVIOUS_PROFILE_KEY, this.lastProfile);
    }
    this.lastProfile = profile;
    const active = profile === 'dyslexia';
    if (active) this.status.show();
    else this.status.hide();
    const dyslexiaConfiguration = vscode.workspace.getConfiguration('codespeak.dyslexia');
    if (dyslexiaConfiguration.get<boolean>('enabled', false) !== active) {
      await dyslexiaConfiguration.update('enabled', active, vscode.ConfigurationTarget.Global);
    }
  }

  public dispose(): void {
    this.stopConfigurationListener();
    this.status.dispose();
  }
}
