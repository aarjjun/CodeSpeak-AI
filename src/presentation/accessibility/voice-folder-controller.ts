import * as vscode from 'vscode';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { AccessibleSpeechService } from '../../application/services/accessible-speech-service';
import type { UserInterfaceGateway } from '../../application/ports/platform/user-interface-gateway';

export class VoiceFolderController {
  public constructor(
    private readonly speech: AccessibleSpeechService,
    private readonly userInterface: UserInterfaceGateway,
  ) {}

  public async open(name?: string): Promise<void> {
    if (name === undefined || name.trim().length === 0) {
      await this.speech.speak('Opening the folder picker.');
      await vscode.commands.executeCommand('workbench.action.files.openFolder');
      return;
    }
    const match = await this.findNamedFolder(name);
    if (match === undefined) {
      await this.speech.speak(
        `I could not find a folder named ${name}. Opening the folder picker instead.`,
        'critical',
      );
      await vscode.commands.executeCommand('workbench.action.files.openFolder');
      return;
    }
    const confirmChanges = vscode.workspace
      .getConfiguration('codespeak')
      .get<boolean>('blindMode.confirmWorkspaceChanges', true);
    if (confirmChanges) {
      const confirmed = await this.userInterface.confirm(
        `Open ${match.fsPath}? This may replace the current workspace.`,
      );
      if (!confirmed) {
        await this.speech.speak('Workspace change cancelled.');
        return;
      }
    }
    await this.speech.speak(`Opening ${match.fsPath}.`);
    await vscode.commands.executeCommand('vscode.openFolder', match, { forceNewWindow: false });
  }

  public async openRecent(): Promise<void> {
    await this.speech.speak(
      'Opening recent projects. Choose a folder from the native recent list.',
    );
    await vscode.commands.executeCommand('workbench.action.openRecent');
  }

  private async findNamedFolder(name: string): Promise<vscode.Uri | undefined> {
    const normalized = name.trim().toLocaleLowerCase();
    const workspaceMatch = vscode.workspace.workspaceFolders?.find((folder) =>
      folder.name.toLocaleLowerCase().includes(normalized),
    );
    if (workspaceMatch !== undefined) return workspaceMatch.uri;
    const commonRoots = [
      homedir(),
      join(homedir(), 'Downloads'),
      join(homedir(), 'Documents'),
      join(homedir(), 'Desktop'),
    ];
    for (const root of commonRoots) {
      const rootUri = vscode.Uri.file(root);
      try {
        if (rootUri.path.toLocaleLowerCase().endsWith(`/${normalized}`)) return rootUri;
        const entries = await vscode.workspace.fs.readDirectory(rootUri);
        const entry = entries.find(
          ([entryName, type]) =>
            type === vscode.FileType.Directory &&
            entryName.toLocaleLowerCase().includes(normalized),
        );
        if (entry !== undefined) return vscode.Uri.joinPath(rootUri, entry[0]);
      } catch {
        continue;
      }
    }
    return undefined;
  }
}
