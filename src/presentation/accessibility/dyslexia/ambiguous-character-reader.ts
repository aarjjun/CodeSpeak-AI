import * as vscode from 'vscode';
import type { AccessibleSpeechService } from '../../../application/services/accessible-speech-service';
import { describeAmbiguousCharacters } from './ambiguous-character-analyzer';

export class AmbiguousCharacterReader {
  public constructor(private readonly speech: AccessibleSpeechService) {}

  public async execute(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (editor === undefined) {
      await this.speech.speak('Open a file before reading ambiguous characters.', 'critical');
      return;
    }
    const range = editor.selection.isEmpty
      ? editor.document.lineAt(editor.selection.active.line).range
      : editor.selection;
    const descriptions = describeAmbiguousCharacters(
      editor.document.getText(range),
      range.start.line + 1,
    );
    await this.speech.speak(
      descriptions.length === 0
        ? 'No commonly confused characters were found in the selected context.'
        : descriptions.join(' '),
    );
  }
}
