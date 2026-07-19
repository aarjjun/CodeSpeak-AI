import * as vscode from 'vscode';
import type { AccessibleSpeechService } from '../../application/services/accessible-speech-service';
import type { VoiceIntent } from '../../domain/speech/speech-contracts';
import type { AudioCueService } from '../../infrastructure/speech/audio-cue-service';
import type { BlindContextReader } from '../accessibility/blind-context-reader';
import type { VoiceFolderController } from '../accessibility/voice-folder-controller';
import { CommandIds } from '../commands/command-ids';
import type { CopilotChatIntegration } from '../integrations/copilot-chat-integration';

interface SymbolItem extends vscode.QuickPickItem {
  readonly symbol: vscode.DocumentSymbol;
}

export class VoiceIntentExecutor {
  private pendingIntent: { readonly intent: VoiceIntent; readonly transcript: string } | undefined;

  public constructor(
    private readonly reader: BlindContextReader,
    private readonly copilot: CopilotChatIntegration,
    private readonly folders: VoiceFolderController,
    private readonly speech: AccessibleSpeechService,
    private readonly audioCues: AudioCueService,
  ) {}

  public async execute(intent: VoiceIntent, transcript: string): Promise<void> {
    if (intent.name === 'confirm') {
      const pending = this.pendingIntent;
      this.pendingIntent = undefined;
      if (pending === undefined) {
        await this.speech.speak('There is no pending action to confirm.');
      } else {
        await this.executeConfirmed(pending.intent, pending.transcript);
      }
      return;
    }
    if (intent.name === 'cancel') {
      this.pendingIntent = undefined;
      await this.speech.speak('Pending voice action cancelled.');
      return;
    }
    const confirmDestructive = vscode.workspace
      .getConfiguration('codespeak')
      .get<boolean>('voice.confirmBeforeDestructiveActions', true);
    if (intent.requiresConfirmation && confirmDestructive) {
      this.pendingIntent = { intent, transcript };
      this.audioCues.play('confirmation');
      await this.speech.speak(
        `Confirmation required for ${transcript}. Say confirm to continue or cancel to stop.`,
        'critical',
      );
      return;
    }
    await this.executeConfirmed(intent, transcript);
  }

  private async executeConfirmed(intent: VoiceIntent, transcript: string): Promise<void> {
    switch (intent.name) {
      case 'codespeak-command':
        await vscode.commands.executeCommand(
          this.stringParameter(intent, 'commandId'),
          intent.requiresConfirmation,
        );
        return;
      case 'create-code':
      case 'modify-code':
        await vscode.commands.executeCommand(
          CommandIds.generateCode,
          this.stringParameter(intent, 'instruction'),
          intent.requiresConfirmation,
        );
        return;
      case 'rename-symbol':
        await this.renameSymbol(this.stringParameter(intent, 'newName'));
        return;
      case 'quick-fix':
        await vscode.commands.executeCommand('editor.action.quickFix');
        await this.speech.speak('Opened available quick fixes. Choose a fix to apply it.');
        return;
      case 'dictation':
        await this.dictate(this.stringParameter(intent, 'text'));
        return;
      case 'copilot-chat':
        await this.copilot.send(this.stringParameter(intent, 'prompt'));
        return;
      case 'open-folder':
        await this.folders.open(this.optionalStringParameter(intent, 'name'));
        return;
      case 'open-file':
        await vscode.commands.executeCommand(
          CommandIds.openFile,
          this.stringParameter(intent, 'path'),
        );
        return;
      case 'go-to-line':
        await vscode.commands.executeCommand(CommandIds.goToLine, intent.parameters['line']);
        return;
      case 'read-line':
        await this.reader.readLine(
          this.numberParameter(intent, 'line'),
          intent.parameters['move'] === true || intent.parameters['explain'] === true,
        );
        if (intent.parameters['explain'] === true) {
          await vscode.commands.executeCommand(CommandIds.explainSelection);
        }
        return;
      case 'read-line-range':
        await this.reader.readRange(
          this.numberParameter(intent, 'start'),
          this.numberParameter(intent, 'end'),
        );
        return;
      case 'read-current-function':
        await vscode.commands.executeCommand(CommandIds.readCodeStructure, true);
        return;
      case 'find-symbol':
        await this.findSymbol(this.stringParameter(intent, 'symbol'));
        return;
      case 'explain-selection':
        await vscode.commands.executeCommand(CommandIds.explainSelection);
        return;
      case 'explain-diagnostic':
        await vscode.commands.executeCommand(CommandIds.explainDiagnostic);
        return;
      case 'summarize-file':
        await vscode.commands.executeCommand(CommandIds.summarizeFile);
        return;
      case 'check-accessibility':
        await vscode.commands.executeCommand(CommandIds.checkAccessibility);
        return;
      case 'start-focus-timer':
        await vscode.commands.executeCommand(CommandIds.startFocusTimer);
        return;
      case 'speech-control':
        await this.controlSpeech(this.stringParameter(intent, 'action'));
        return;
      case 'undo':
        await vscode.commands.executeCommand(CommandIds.undo);
        return;
      case 'redo':
        await vscode.commands.executeCommand(CommandIds.redo);
        return;
      case 'unknown':
        this.audioCues.play('failed');
        await this.speech.speak(
          `I could not confidently interpret ${transcript}. Say help for examples, or begin with type to dictate text.`,
          'critical',
        );
        return;
      case 'confirm':
      case 'cancel':
        return;
    }
  }

  private async dictate(text: string): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (editor === undefined) {
      await this.speech.speak('No editor is active for dictation.', 'critical');
      return;
    }
    const applied = await editor.edit((builder) => builder.replace(editor.selection, text));
    await this.speech.speak(
      applied ? `Inserted dictated text: ${text}` : 'Dictation could not be inserted.',
      applied ? 'normal' : 'critical',
    );
  }

  private async renameSymbol(spokenName: string): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (editor === undefined) {
      await this.speech.speak('No editor is active for rename.', 'critical');
      return;
    }
    const newName = spokenName
      .replace(/\s+(\p{L})/gu, (_match, letter: string) => letter.toLocaleUpperCase())
      .replace(/\s+/gu, '');
    const edit = await vscode.commands.executeCommand<vscode.WorkspaceEdit | undefined>(
      'vscode.executeDocumentRenameProvider',
      editor.document.uri,
      editor.selection.active,
      newName,
    );
    if (edit === undefined) {
      await this.speech.speak('The current symbol cannot be renamed.', 'critical');
      return;
    }
    const referenceCount = edit.entries().reduce((count, [, edits]) => count + edits.length, 0);
    const applied = await vscode.workspace.applyEdit(edit);
    await this.speech.speak(
      applied
        ? `Renamed ${String(referenceCount)} references to ${newName}.`
        : 'The rename could not be applied.',
      applied ? 'normal' : 'critical',
    );
  }

  private async controlSpeech(action: string): Promise<void> {
    if (action === 'stop' || action === 'stop reading') return this.speech.stop();
    if (action === 'pause') return this.speech.pause();
    if (action === 'continue' || action === 'resume') return this.speech.resume();
    if (action === 'repeat that') return this.speech.repeat();
    if (action.includes('slower')) return this.speech.adjustRate('slower');
    await this.speech.adjustRate('faster');
  }

  private async findSymbol(query: string): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (editor === undefined) {
      await this.speech.speak('Open a file before finding a symbol.', 'critical');
      return;
    }
    const symbols =
      (await vscode.commands.executeCommand<readonly vscode.DocumentSymbol[] | undefined>(
        'vscode.executeDocumentSymbolProvider',
        editor.document.uri,
      )) ?? [];
    const matches = this.flattenSymbols(symbols).filter((symbol) =>
      symbol.name.toLocaleLowerCase().includes(query.toLocaleLowerCase()),
    );
    if (matches.length === 0) {
      await this.speech.speak(`No symbol matching ${query} was found.`, 'critical');
      return;
    }
    let selected = matches[0];
    if (matches.length > 1) {
      const item = await vscode.window.showQuickPick<SymbolItem>(
        matches.map((symbol) => ({
          label: symbol.name,
          description: vscode.SymbolKind[symbol.kind],
          detail: `Line ${String(symbol.selectionRange.start.line + 1)}`,
          symbol,
          accessibilityInformation: {
            label: `${symbol.name}, ${vscode.SymbolKind[symbol.kind]}, line ${String(symbol.selectionRange.start.line + 1)}`,
          },
        })),
        { title: `Choose a symbol matching ${query}`, matchOnDescription: true },
      );
      selected = item?.symbol;
    }
    if (selected === undefined) return;
    editor.selection = new vscode.Selection(
      selected.selectionRange.start,
      selected.selectionRange.start,
    );
    editor.revealRange(selected.range, vscode.TextEditorRevealType.InCenterIfOutsideViewport);
    await this.speech.speak(
      `Moved to ${selected.name}, line ${String(selected.selectionRange.start.line + 1)}.`,
    );
  }

  private flattenSymbols(
    symbols: readonly vscode.DocumentSymbol[],
  ): readonly vscode.DocumentSymbol[] {
    return symbols.flatMap((symbol) => [symbol, ...this.flattenSymbols(symbol.children)]);
  }

  private stringParameter(intent: VoiceIntent, name: string): string {
    const value = intent.parameters[name];
    return typeof value === 'string' ? value : String(value ?? '');
  }

  private optionalStringParameter(intent: VoiceIntent, name: string): string | undefined {
    const value = intent.parameters[name];
    return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
  }

  private numberParameter(intent: VoiceIntent, name: string): number {
    const value = intent.parameters[name];
    return typeof value === 'number' ? value : Number(value);
  }
}
