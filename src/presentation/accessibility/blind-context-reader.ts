import * as vscode from 'vscode';
import type { AccessibleSpeechService } from '../../application/services/accessible-speech-service';

export class BlindContextReader {
  private diagnosticIndex = -1;
  public constructor(private readonly speech: AccessibleSpeechService) {}

  public async readSelection(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (editor === undefined) return this.speech.speak('No editor is active.', 'critical');
    const range = editor.selection.isEmpty
      ? editor.document.lineAt(editor.selection.active.line).range
      : editor.selection;
    const text = editor.document.getText(range);
    const symbols = await this.symbolsInRange(editor.document, range);
    const structure =
      symbols.length === 0
        ? 'No named symbols were detected.'
        : `Important symbols: ${symbols.slice(0, 6).join(', ')}.`;
    const scope = editor.selection.isEmpty
      ? 'The current line is being used because no text is selected.'
      : `Selection starts at line ${String(range.start.line + 1)} and ends at line ${String(range.end.line + 1)}.`;
    await this.speech.speak(
      `${scope} Language ${editor.document.languageId}. ${structure} ${this.describeText(text)}`,
    );
  }

  public async readSelectionDiagnostics(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (editor === undefined) return this.speech.speak('No editor is active.', 'critical');
    const range = editor.selection.isEmpty
      ? editor.document.lineAt(editor.selection.active.line).range
      : editor.selection;
    const diagnostics = vscode.languages
      .getDiagnostics(editor.document.uri)
      .filter((diagnostic) => diagnostic.range.intersection(range) !== undefined);
    if (diagnostics.length === 0)
      return this.speech.speak('No diagnostics were found in the selected context.');
    await this.speech.speak(
      diagnostics
        .map(
          (diagnostic) =>
            `${this.severity(diagnostic.severity)} on line ${String(diagnostic.range.start.line + 1)}. ${diagnostic.message}`,
        )
        .join('. '),
    );
  }

  public async selectCurrentSymbol(): Promise<boolean> {
    const editor = vscode.window.activeTextEditor;
    if (editor === undefined) {
      await this.speech.speak('No editor is active.', 'critical');
      return false;
    }
    const symbol = this.deepestContainingSymbol(
      await this.documentSymbols(editor.document),
      editor.selection.active,
    );
    if (symbol === undefined) {
      await this.speech.speak('The cursor is not inside a named function or class.', 'critical');
      return false;
    }
    editor.selection = new vscode.Selection(symbol.range.start, symbol.range.end);
    editor.revealRange(symbol.range, vscode.TextEditorRevealType.InCenterIfOutsideViewport);
    return true;
  }

  public async readLine(lineNumber: number, move = false): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (editor === undefined) return this.speech.speak('No editor is active.', 'critical');
    if (lineNumber < 1 || lineNumber > editor.document.lineCount) {
      return this.speech.speak(
        `I could not find line ${String(lineNumber)}. This file contains ${String(editor.document.lineCount)} lines.`,
        'critical',
      );
    }
    const line = editor.document.lineAt(lineNumber - 1);
    if (move) {
      editor.selection = new vscode.Selection(line.range.start, line.range.start);
      editor.revealRange(line.range, vscode.TextEditorRevealType.InCenterIfOutsideViewport);
    }
    await this.speech.speak(`Line ${String(lineNumber)}. ${this.describeText(line.text)}`);
  }

  public async readRange(start: number, end: number): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (editor === undefined) return this.speech.speak('No editor is active.', 'critical');
    if (start < 1 || end < start || end > editor.document.lineCount) {
      return this.speech.speak(
        `That line range is invalid. This file contains ${String(editor.document.lineCount)} lines.`,
        'critical',
      );
    }
    const range = new vscode.Range(
      start - 1,
      0,
      end - 1,
      editor.document.lineAt(end - 1).text.length,
    );
    await this.speech.speak(
      `Lines ${String(start)} through ${String(end)}. ${this.describeText(editor.document.getText(range))}`,
    );
  }

  public async readRelativeLine(offset: number): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (editor === undefined) return this.speech.speak('No editor is active.', 'critical');
    await this.readLine(editor.selection.active.line + 1 + offset, true);
  }

  public async whereAmI(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (editor === undefined) return this.speech.speak('No editor is active.', 'critical');
    const position = editor.selection.active;
    const symbols = await this.documentSymbols(editor.document);
    const containing = this.deepestContainingSymbol(symbols, position);
    const diagnostics = vscode.languages
      .getDiagnostics(editor.document.uri)
      .filter((item) => item.range.contains(position));
    const selected = editor.selection.isEmpty
      ? 'No text is selected.'
      : `Text is selected from line ${String(editor.selection.start.line + 1)} to line ${String(editor.selection.end.line + 1)}.`;
    const location =
      containing === undefined
        ? 'You are not inside a named function or class.'
        : `You are in ${containing.name}.`;
    await this.speech.speak(
      `${vscode.workspace.asRelativePath(editor.document.uri)}. Line ${String(position.line + 1)}, column ${String(position.character + 1)}. ${location} ${selected} ${String(diagnostics.length)} diagnostics are on this position.`,
    );
  }

  public async readCurrentDiagnostic(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (editor === undefined) return this.speech.speak('No editor is active.', 'critical');
    const line = editor.selection.active.line;
    const diagnostics = vscode.languages
      .getDiagnostics(editor.document.uri)
      .filter(
        (diagnostic) => diagnostic.range.start.line <= line && diagnostic.range.end.line >= line,
      );
    if (diagnostics.length === 0)
      return this.speech.speak(`No diagnostics were found on line ${String(line + 1)}.`);
    await this.speech.speak(
      diagnostics
        .map(
          (diagnostic) =>
            `${this.severity(diagnostic.severity)} on line ${String(diagnostic.range.start.line + 1)}. ${diagnostic.message}`,
        )
        .join('. '),
      diagnostics.some((diagnostic) => diagnostic.severity === vscode.DiagnosticSeverity.Error)
        ? 'critical'
        : 'normal',
    );
  }

  public async readAllDiagnostics(): Promise<void> {
    const diagnostics = vscode.languages
      .getDiagnostics()
      .flatMap(([uri, items]) => items.map((diagnostic) => ({ uri, diagnostic })));
    if (diagnostics.length === 0) return this.speech.speak('No workspace diagnostics were found.');
    const summary = diagnostics
      .slice(0, 10)
      .map(
        ({ uri, diagnostic }) =>
          `${this.severity(diagnostic.severity)} in ${vscode.workspace.asRelativePath(uri)}, line ${String(diagnostic.range.start.line + 1)}. ${diagnostic.message}`,
      );
    await this.speech.speak(
      `${String(diagnostics.length)} workspace diagnostics were found. ${summary.join('. ')}${diagnostics.length > 10 ? '. Only the first ten were read.' : ''}`,
    );
  }

  public async readNextDiagnostic(): Promise<void> {
    const diagnostics = vscode.languages
      .getDiagnostics()
      .flatMap(([uri, items]) => items.map((diagnostic) => ({ uri, diagnostic })));
    if (diagnostics.length === 0) return this.speech.speak('No workspace diagnostics were found.');
    this.diagnosticIndex = (this.diagnosticIndex + 1) % diagnostics.length;
    const selected = diagnostics[this.diagnosticIndex];
    if (selected === undefined) return;
    const document = await vscode.workspace.openTextDocument(selected.uri);
    const editor = await vscode.window.showTextDocument(document, { preview: false });
    editor.selection = new vscode.Selection(
      selected.diagnostic.range.start,
      selected.diagnostic.range.start,
    );
    editor.revealRange(
      selected.diagnostic.range,
      vscode.TextEditorRevealType.InCenterIfOutsideViewport,
    );
    await this.speech.speak(
      `${this.severity(selected.diagnostic.severity)} in ${vscode.workspace.asRelativePath(selected.uri)}, line ${String(selected.diagnostic.range.start.line + 1)}. ${selected.diagnostic.message}`,
    );
  }

  private severity(severity: vscode.DiagnosticSeverity): string {
    return vscode.DiagnosticSeverity[severity];
  }

  private describeText(text: string): string {
    const trimmed = text.trim();
    if (trimmed.length === 0) return 'This line is blank.';
    if (/^\}+;?$/u.test(trimmed)) return 'This line closes a code block.';
    if (/^\]+[),;]?$/u.test(trimmed)) return 'This line closes an array or expression.';
    if (this.isPunctuationOnly(trimmed)) {
      return `This line contains punctuation that closes or separates code: ${trimmed}`;
    }
    return trimmed;
  }

  private isPunctuationOnly(value: string): boolean {
    for (const character of value) {
      if (!'(){}[];,.'.includes(character)) return false;
    }
    return true;
  }

  private async symbolsInRange(
    document: vscode.TextDocument,
    range: vscode.Range,
  ): Promise<readonly string[]> {
    return (await this.documentSymbols(document))
      .filter((symbol) => range.intersection(symbol.range) !== undefined)
      .map((symbol) => symbol.name);
  }

  private async documentSymbols(
    document: vscode.TextDocument,
  ): Promise<readonly vscode.DocumentSymbol[]> {
    return (
      (await vscode.commands.executeCommand<readonly vscode.DocumentSymbol[] | undefined>(
        'vscode.executeDocumentSymbolProvider',
        document.uri,
      )) ?? []
    );
  }

  private deepestContainingSymbol(
    symbols: readonly vscode.DocumentSymbol[],
    position: vscode.Position,
  ): vscode.DocumentSymbol | undefined {
    for (const symbol of symbols) {
      if (!symbol.range.contains(position)) continue;
      return this.deepestContainingSymbol(symbol.children, position) ?? symbol;
    }
    return undefined;
  }
}
