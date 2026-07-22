import * as vscode from 'vscode';
import type { AccessibleSpeechService } from '../../application/services/accessible-speech-service';

const COPILOT_CHAT_EXTENSION_ID = 'github.copilot-chat';

export class CopilotChatIntegration {
  public constructor(private readonly speech: AccessibleSpeechService) {}

  public async send(prompt: string): Promise<void> {
    const extension = vscode.extensions.getExtension(COPILOT_CHAT_EXTENSION_ID);
    if (extension === undefined) {
      await this.speech.speak(
        'GitHub Copilot Chat is not installed. The request was not sent to Gemini.',
        'critical',
      );
      return;
    }
    const availableCommands = await vscode.commands.getCommands(true);
    if (!availableCommands.includes('workbench.action.chat.open')) {
      await this.speech.speak(
        'Copilot Chat is installed, but this VS Code version does not expose the command needed to open Chat.',
        'critical',
      );
      return;
    }
    const contextualPrompt = this.withEditorContext(prompt);
    await vscode.commands.executeCommand('workbench.action.chat.open', {
      query: contextualPrompt,
      isPartialQuery: true,
    });
    await this.speech.speak(
      contextualPrompt.length === 0
        ? 'Opened Copilot Chat.'
        : 'Opened Copilot Chat with the request and editor context. Review the prompt and submit it in Chat.',
    );
  }

  private withEditorContext(prompt: string): string {
    const editor = vscode.window.activeTextEditor;
    if (editor === undefined) return prompt.trim();
    const configuration = vscode.workspace.getConfiguration('codespeak');
    const includeSelection = configuration.get<boolean>(
      'privacy.includeSelectionInAiRequests',
      true,
    );
    const selection =
      includeSelection && !editor.selection.isEmpty
        ? editor.document.getText(editor.selection).slice(0, 12_000)
        : '';
    const diagnostics = vscode.languages
      .getDiagnostics(editor.document.uri)
      .filter(
        (diagnostic) =>
          diagnostic.range.intersection(editor.selection) !== undefined ||
          diagnostic.range.contains(editor.selection.active),
      )
      .slice(0, 5)
      .map((diagnostic) => diagnostic.message);
    return [
      prompt.trim(),
      `File: ${vscode.workspace.asRelativePath(editor.document.uri)}`,
      selection.length === 0 ? '' : `Selected code:\n${selection}`,
      diagnostics.length === 0 ? '' : `Diagnostics:\n${diagnostics.join('\n')}`,
    ]
      .filter((part) => part.length > 0)
      .join('\n\n');
  }
}
