import * as vscode from 'vscode';
import type {
  AnnouncementPriority,
  TextInputOptions,
  UserChoice,
  UserInterfaceGateway,
} from '../../application/ports/platform/user-interface-gateway';
import type { VoiceCommandCancellation } from '../voice/voice-command-cancellation';

interface AccessibleChoiceItem extends vscode.QuickPickItem {
  readonly choiceId: string;
}

export class VsCodeUserInterfaceGateway implements UserInterfaceGateway, vscode.Disposable {
  private readonly announcementItem: vscode.StatusBarItem;

  public constructor(private readonly voiceCancellation?: VoiceCommandCancellation) {
    this.announcementItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    this.announcementItem.name = 'CodeSpeak AI announcements';
  }

  public async announce(message: string, priority: AnnouncementPriority = 'polite'): Promise<void> {
    if (priority === 'assertive') {
      await vscode.window.showWarningMessage(message);
      return;
    }

    this.announcementItem.text = `$(unmute) ${message}`;
    this.announcementItem.accessibilityInformation = {
      label: message,
      role: 'status',
    };
    this.announcementItem.show();
  }

  public async showInformation(message: string): Promise<void> {
    await vscode.window.showInformationMessage(message);
  }

  public async showWarning(message: string): Promise<void> {
    await vscode.window.showWarningMessage(message);
  }

  public async showError(message: string): Promise<void> {
    await vscode.window.showErrorMessage(message);
  }

  public async choose(prompt: string, choices: readonly UserChoice[]): Promise<string | undefined> {
    const items: readonly AccessibleChoiceItem[] = choices.map((choice) => ({
      label: choice.label,
      ...(choice.description === undefined ? {} : { description: choice.description }),
      choiceId: choice.id,
      accessibilityInformation: {
        label: [choice.label, choice.description].filter(Boolean).join('. '),
      },
    }));
    const selected = await vscode.window.showQuickPick(items, {
      title: prompt,
      placeHolder: prompt,
      matchOnDescription: true,
    });
    return selected?.choiceId;
  }

  public async requestText(
    prompt: string,
    options: TextInputOptions = {},
  ): Promise<string | undefined> {
    return vscode.window.showInputBox({
      title: prompt,
      prompt,
      ignoreFocusOut: true,
      ...(options.password === undefined ? {} : { password: options.password }),
      ...(options.placeHolder === undefined ? {} : { placeHolder: options.placeHolder }),
      ...(options.value === undefined ? {} : { value: options.value }),
    });
  }

  public async confirm(prompt: string): Promise<boolean> {
    const confirmation = await vscode.window.showWarningMessage(
      prompt,
      { modal: true },
      'Continue',
    );
    return confirmation === 'Continue';
  }

  public async showProgress<T>(
    title: string,
    operation: (signal: AbortSignal) => Promise<T>,
  ): Promise<T> {
    return vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title,
        cancellable: true,
      },
      async (_progress, cancellationToken) => {
        const controller = new AbortController();
        const subscription = cancellationToken.onCancellationRequested(() => controller.abort());
        try {
          const voiceSignal = this.voiceCancellation?.currentSignal;
          return await operation(
            voiceSignal === undefined
              ? controller.signal
              : AbortSignal.any([controller.signal, voiceSignal]),
          );
        } finally {
          subscription.dispose();
        }
      },
    );
  }

  public dispose(): void {
    this.announcementItem.dispose();
  }
}
