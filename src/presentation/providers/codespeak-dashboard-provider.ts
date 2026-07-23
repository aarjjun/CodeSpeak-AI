import * as vscode from 'vscode';
import type { AccessibilityProfileService } from '../../application/services/accessibility-profile-service';

interface DashboardItem {
  readonly label: string;
  readonly description: string;
  readonly command: string;
}

export class CodeSpeakDashboardProvider
  implements vscode.TreeDataProvider<DashboardItem>, vscode.Disposable
{
  private readonly changed = new vscode.EventEmitter<DashboardItem | undefined>();
  public readonly onDidChangeTreeData = this.changed.event;

  public constructor(private readonly profiles: AccessibilityProfileService) {}

  public getTreeItem(item: DashboardItem): vscode.TreeItem {
    const treeItem = new vscode.TreeItem(item.label, vscode.TreeItemCollapsibleState.None);
    treeItem.description = item.description;
    treeItem.tooltip = `${item.label}. ${item.description}`;
    treeItem.command = { command: item.command, title: item.label };
    treeItem.accessibilityInformation = {
      label: `${item.label}. ${item.description}`,
      role: 'button',
    };
    return treeItem;
  }

  public getChildren(): DashboardItem[] {
    const profile = this.profiles.current();
    return [
      {
        label: `Profile: ${profile.name}`,
        description: 'Change accessibility profile',
        command: 'codespeak.selectAccessibilityProfile',
      },
      {
        label: 'Explain selected code',
        description: 'Get an accessible explanation with reasoning and alternatives',
        command: 'codespeak.explainSelection',
      },
      {
        label: 'Explain current error',
        description: 'Translate a diagnostic into plain language',
        command: 'codespeak.explainDiagnostic',
      },
      {
        label: 'Ask a learning question',
        description: 'Get an explanation, example, exercise, and feedback',
        command: 'codespeak.askLearningQuestion',
      },
      {
        label: 'Toggle local demo AI',
        description: 'Use deterministic AI demonstrations without an external API key',
        command: 'codespeak.ai.toggleDemoMode',
      },
      {
        label: 'Check accessibility',
        description: 'Publish deterministic JSX and TSX findings',
        command: 'codespeak.checkAccessibility',
      },
      {
        label: 'Start focus timer',
        description: 'Begin a 25 minute focus session',
        command: 'codespeak.focus.startTimer',
      },
      {
        label: 'Start voice command',
        description: 'Use local VS Code Speech transcription',
        command: 'codespeak.voice.toggle',
      },
      {
        label: 'Test voice without microphone',
        description: 'Type a phrase and run the same Blind Mode voice pipeline',
        command: 'codespeak.voice.simulate',
      },
    ];
  }

  public refresh(): void {
    this.changed.fire(undefined);
  }
  public dispose(): void {
    this.changed.dispose();
  }
}
