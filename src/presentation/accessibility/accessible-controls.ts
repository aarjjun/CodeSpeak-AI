import * as vscode from 'vscode';
import type { ConfigurationGateway } from '../../application/ports/platform/configuration-gateway';
import type { UserInterfaceGateway } from '../../application/ports/platform/user-interface-gateway';
import { CommandIds } from '../commands/command-ids';

interface AccessibleControl extends vscode.QuickPickItem {
  readonly command: string;
}

const COMMON_CONTROLS: readonly AccessibleControl[] = [
  control('Toggle voice mode', 'Start or stop voice listening', CommandIds.voiceToggle),
  control(
    'Explain selected code',
    'Explain the current selection or context',
    CommandIds.explainSelection,
  ),
  control('Read current line', 'Read the editor line at the cursor', CommandIds.readCurrentLine),
  control(
    'Open a workspace file',
    'Choose a file using a native accessible picker',
    CommandIds.openFile,
  ),
  control('Go to a line', 'Enter a line number using a native input box', CommandIds.goToLine),
  control('Start focus timer', 'Begin a configurable focus session', CommandIds.startFocusTimer),
  control(
    'Select accessibility profile',
    'Change or restore profile settings',
    CommandIds.selectAccessibilityProfile,
  ),
];

export class AccessibleControls {
  public constructor(
    private readonly configuration: ConfigurationGateway,
    private readonly userInterface: UserInterfaceGateway,
  ) {}

  public async show(): Promise<void> {
    const profile = this.configuration.get().accessibilityProfile;
    const selected = await vscode.window.showQuickPick(COMMON_CONTROLS, {
      title: `CodeSpeak accessible controls for ${profile}`,
      placeHolder: 'Choose an action. All controls support keyboard and screen reader navigation.',
      matchOnDescription: true,
    });
    if (selected === undefined) {
      await this.userInterface.announce('Accessible controls closed without running an action.');
      return;
    }
    await vscode.commands.executeCommand(selected.command);
  }

  public async toggleFocusView(): Promise<void> {
    await vscode.commands.executeCommand('workbench.action.toggleZenMode');
    await this.userInterface.announce(
      'VS Code Focus View toggled. Run Toggle Focus View again to restore the previous layout.',
    );
  }
}

function control(label: string, description: string, command: string): AccessibleControl {
  return {
    label,
    description,
    command,
  };
}
