import * as vscode from 'vscode';
import type { ConfigurationGateway } from '../../../application/ports/platform/configuration-gateway';
import type { UserInterfaceGateway } from '../../../application/ports/platform/user-interface-gateway';

export class DyslexiaFocusController implements vscode.Disposable {
  private active = false;
  private readonly stopConfigurationListener: () => void;

  public constructor(
    private readonly configuration: ConfigurationGateway,
    private readonly userInterface: UserInterfaceGateway,
  ) {
    this.stopConfigurationListener = configuration.onDidChange(() => {
      void this.restoreLayoutWhenProfileChanges();
    });
  }

  public async toggle(): Promise<void> {
    await vscode.commands.executeCommand('workbench.action.toggleZenMode');
    this.active = !this.active;
    await this.userInterface.announce(
      this.active
        ? 'Dyslexia Focus Mode enabled. Only the active editor is emphasized.'
        : 'Dyslexia Focus Mode disabled. The previous VS Code layout was restored.',
    );
  }

  private async restoreLayoutWhenProfileChanges(): Promise<void> {
    if (!this.active || this.configuration.get().accessibilityProfile === 'dyslexia') return;
    this.active = false;
    await vscode.commands.executeCommand('workbench.action.toggleZenMode');
    await this.userInterface.announce(
      'Dyslexia Focus Mode disabled because another accessibility profile was selected.',
    );
  }

  public dispose(): void {
    this.stopConfigurationListener();
  }
}
