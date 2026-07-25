import * as vscode from 'vscode';
import type { ConfigurationGateway } from '../../application/ports/platform/configuration-gateway';
import { findIndentationBlock } from './dyslexia/active-block-highlighter';
import { readDyslexiaSettings } from './dyslexia/dyslexia-settings';

export class ProfileEditorController implements vscode.Disposable {
  private readonly activeLineDecoration = vscode.window.createTextEditorDecorationType({
    isWholeLine: true,
    backgroundColor: new vscode.ThemeColor('editor.lineHighlightBackground'),
    overviewRulerColor: new vscode.ThemeColor('editorOverviewRuler.rangeHighlightForeground'),
  });
  private readonly bracketDecoration = vscode.window.createTextEditorDecorationType({
    color: new vscode.ThemeColor('editorBracketHighlight.foreground1'),
    fontWeight: 'bold',
  });
  private readonly activeBlockDecoration = vscode.window.createTextEditorDecorationType({
    isWholeLine: true,
    backgroundColor: new vscode.ThemeColor('editor.rangeHighlightBackground'),
    borderWidth: '0 0 0 2px',
    borderStyle: 'solid',
    borderColor: new vscode.ThemeColor('focusBorder'),
  });
  private readonly inactiveCodeDecoration = vscode.window.createTextEditorDecorationType({
    opacity: '0.45',
  });
  private readonly subscriptions: vscode.Disposable[];
  private readonly stopConfigurationListener: () => void;
  private renderSequence = 0;

  public constructor(private readonly configuration: ConfigurationGateway) {
    this.stopConfigurationListener = this.configuration.onDidChange(() => void this.render());
    this.subscriptions = [
      vscode.window.onDidChangeActiveTextEditor(() => void this.render()),
      vscode.window.onDidChangeTextEditorSelection(() => void this.render()),
      vscode.workspace.onDidChangeTextDocument((event) => {
        if (event.document === vscode.window.activeTextEditor?.document) void this.render();
      }),
    ];
    void this.render();
  }

  private async render(): Promise<void> {
    const sequence = ++this.renderSequence;
    const editor = vscode.window.activeTextEditor;
    const profile = this.configuration.get().accessibilityProfile;
    void vscode.commands.executeCommand('setContext', 'codespeak.focusProfile', profile === 'adhd');
    void vscode.commands.executeCommand(
      'setContext',
      'codespeak.voiceFirstProfile',
      profile === 'blind',
    );
    for (const visibleEditor of vscode.window.visibleTextEditors) {
      if (visibleEditor === editor) continue;
      this.clearDecorations(visibleEditor);
    }
    if (editor === undefined) return;
    const dyslexia = readDyslexiaSettings(vscode.workspace.getConfiguration('codespeak.dyslexia'));
    const dyslexiaActive = profile === 'dyslexia';
    editor.setDecorations(
      this.activeLineDecoration,
      profile === 'adhd' || (dyslexiaActive && dyslexia.highlightActiveLine)
        ? [new vscode.Range(editor.selection.active.line, 0, editor.selection.active.line, 0)]
        : [],
    );
    editor.setDecorations(
      this.bracketDecoration,
      dyslexiaActive && dyslexia.enableBracketColors ? this.bracketRanges(editor.document) : [],
    );
    const activeBlock =
      profile === 'adhd' || (dyslexiaActive && dyslexia.highlightCurrentBlock)
        ? await this.findActiveBlockRange(editor, dyslexiaActive)
        : undefined;
    if (sequence !== this.renderSequence || editor !== vscode.window.activeTextEditor) return;
    editor.setDecorations(
      this.activeBlockDecoration,
      activeBlock === undefined ? [] : [activeBlock],
    );
    editor.setDecorations(
      this.inactiveCodeDecoration,
      dyslexiaActive && dyslexia.dimInactiveCode && activeBlock !== undefined
        ? this.inactiveRanges(editor.document, activeBlock)
        : [],
    );
  }

  private bracketRanges(document: vscode.TextDocument): readonly vscode.Range[] {
    const ranges: vscode.Range[] = [];
    const text = document.getText();
    const maximumRanges = 1_000;
    for (let index = 0; index < text.length && ranges.length < maximumRanges; index += 1) {
      if (!'[]{}()'.includes(text[index] ?? '')) continue;
      const position = document.positionAt(index);
      ranges.push(new vscode.Range(position, document.positionAt(index + 1)));
    }
    return ranges;
  }

  private async findActiveSymbolRange(
    editor: vscode.TextEditor,
  ): Promise<vscode.Range | undefined> {
    try {
      const symbols = await vscode.commands.executeCommand<
        readonly vscode.DocumentSymbol[] | undefined
      >('vscode.executeDocumentSymbolProvider', editor.document.uri);
      if (symbols === undefined) return undefined;
      return smallestContainingSymbol(symbols, editor.selection.active)?.range;
    } catch {
      return undefined;
    }
  }

  private async findActiveBlockRange(
    editor: vscode.TextEditor,
    useFallback: boolean,
  ): Promise<vscode.Range | undefined> {
    const symbol = await this.findActiveSymbolRange(editor);
    if (!useFallback) return symbol;
    const lines = Array.from(
      { length: editor.document.lineCount },
      (_, index) => editor.document.lineAt(index).text,
    );
    const block = findIndentationBlock(lines, editor.selection.active.line);
    const fallback = new vscode.Range(
      block.startLine,
      0,
      block.endLine,
      editor.document.lineAt(block.endLine).text.length,
    );
    return symbol === undefined || rangeSize(fallback) < rangeSize(symbol) ? fallback : symbol;
  }

  private inactiveRanges(
    document: vscode.TextDocument,
    activeBlock: vscode.Range,
  ): readonly vscode.Range[] {
    const ranges: vscode.Range[] = [];
    if (activeBlock.start.line > 0) {
      ranges.push(
        new vscode.Range(
          0,
          0,
          activeBlock.start.line - 1,
          document.lineAt(activeBlock.start.line - 1).text.length,
        ),
      );
    }
    if (activeBlock.end.line < document.lineCount - 1) {
      const lastLine = document.lineCount - 1;
      ranges.push(
        new vscode.Range(
          activeBlock.end.line + 1,
          0,
          lastLine,
          document.lineAt(lastLine).text.length,
        ),
      );
    }
    return ranges;
  }

  private clearDecorations(editor: vscode.TextEditor): void {
    editor.setDecorations(this.activeLineDecoration, []);
    editor.setDecorations(this.bracketDecoration, []);
    editor.setDecorations(this.activeBlockDecoration, []);
    editor.setDecorations(this.inactiveCodeDecoration, []);
  }

  public dispose(): void {
    this.stopConfigurationListener();
    for (const subscription of this.subscriptions) subscription.dispose();
    this.activeLineDecoration.dispose();
    this.bracketDecoration.dispose();
    this.activeBlockDecoration.dispose();
    this.inactiveCodeDecoration.dispose();
  }
}

function smallestContainingSymbol(
  symbols: readonly vscode.DocumentSymbol[],
  position: vscode.Position,
): vscode.DocumentSymbol | undefined {
  let best: vscode.DocumentSymbol | undefined;
  for (const symbol of symbols) {
    if (!symbol.range.contains(position)) continue;
    const nested = smallestContainingSymbol(symbol.children, position);
    const candidate = nested ?? symbol;
    if (best === undefined || rangeSize(candidate.range) < rangeSize(best.range)) best = candidate;
  }
  return best;
}

function rangeSize(range: vscode.Range): number {
  return (
    (range.end.line - range.start.line) * 100_000 + range.end.character - range.start.character
  );
}
