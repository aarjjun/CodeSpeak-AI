import * as vscode from 'vscode';
import type { ConfigurationGateway } from '../../application/ports/platform/configuration-gateway';

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
      profile === 'blind' || profile === 'motor',
    );
    if (editor === undefined) return;
    editor.setDecorations(
      this.activeLineDecoration,
      profile === 'adhd'
        ? [new vscode.Range(editor.selection.active.line, 0, editor.selection.active.line, 0)]
        : [],
    );
    editor.setDecorations(
      this.bracketDecoration,
      profile === 'dyslexia' ? this.bracketRanges(editor.document) : [],
    );
    const activeBlock = profile === 'adhd' ? await this.findActiveSymbolRange(editor) : undefined;
    if (sequence !== this.renderSequence || editor !== vscode.window.activeTextEditor) return;
    editor.setDecorations(
      this.activeBlockDecoration,
      activeBlock === undefined ? [] : [activeBlock],
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

  public dispose(): void {
    this.stopConfigurationListener();
    for (const subscription of this.subscriptions) subscription.dispose();
    this.activeLineDecoration.dispose();
    this.bracketDecoration.dispose();
    this.activeBlockDecoration.dispose();
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
