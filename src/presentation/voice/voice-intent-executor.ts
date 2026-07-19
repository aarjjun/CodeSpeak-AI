import * as vscode from 'vscode';
import type { UserInterfaceGateway } from '../../application/ports/platform/user-interface-gateway';
import type { VoiceIntent } from '../../domain/speech/speech-contracts';
import { CommandIds } from '../commands/command-ids';

interface SymbolItem extends vscode.QuickPickItem {
  readonly symbol: vscode.DocumentSymbol;
}

export class VoiceIntentExecutor {
  public constructor(private readonly userInterface: UserInterfaceGateway) {}

  public async execute(intent: VoiceIntent, transcript: string): Promise<void> {
    if (intent.requiresConfirmation) {
      const confirmed = await this.userInterface.confirm(
        `Voice command recognized: “${transcript}”. Continue?`,
      );
      if (!confirmed) {
        await this.userInterface.announce('Voice command cancelled.');
        return;
      }
    }

    switch (intent.name) {
      case 'create-code':
        await vscode.commands.executeCommand(
          CommandIds.generateCode,
          this.stringParameter(intent, 'instruction'),
        );
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
      case 'read-current-function':
        await vscode.commands.executeCommand(CommandIds.readCodeStructure, true);
        return;
      case 'find-symbol':
        await this.findSymbol(this.stringParameter(intent, 'symbol'));
        return;
      case 'explain-selection':
        await vscode.commands.executeCommand(CommandIds.explainSelection);
        return;
      case 'undo':
        await vscode.commands.executeCommand(CommandIds.undo);
        return;
      case 'redo':
        await vscode.commands.executeCommand(CommandIds.redo);
        return;
      case 'unknown':
        await this.userInterface.showWarning(
          'Command not recognized. Try “open app.py”, “go to line 50”, “find function login”, “explain selection”, “undo”, or “create code …”.',
        );
    }
  }

  private async findSymbol(query: string): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (editor === undefined) {
      await this.userInterface.showWarning('Open a file before finding a symbol.');
      return;
    }

    const symbols =
      (await vscode.commands.executeCommand<readonly vscode.DocumentSymbol[] | undefined>(
        'vscode.executeDocumentSymbolProvider',
        editor.document.uri,
      )) ?? [];
    const normalizedQuery = query.toLocaleLowerCase();
    const matches = this.flattenSymbols(symbols).filter((symbol) =>
      symbol.name.toLocaleLowerCase().includes(normalizedQuery),
    );

    if (matches.length === 0) {
      await this.userInterface.showWarning(`No symbol matching “${query}” was found.`);
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

    if (selected === undefined) {
      return;
    }
    editor.selection = new vscode.Selection(
      selected.selectionRange.start,
      selected.selectionRange.start,
    );
    editor.revealRange(selected.range, vscode.TextEditorRevealType.InCenterIfOutsideViewport);
    await this.userInterface.announce(
      `${selected.name}, line ${String(selected.selectionRange.start.line + 1)}.`,
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
}
