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
  private readonly subscriptions: vscode.Disposable[];
  private readonly stopConfigurationListener: () => void;

  public constructor(private readonly configuration: ConfigurationGateway) {
    this.stopConfigurationListener = this.configuration.onDidChange(() => this.render());
    this.subscriptions = [
      vscode.window.onDidChangeActiveTextEditor(() => this.render()),
      vscode.window.onDidChangeTextEditorSelection(() => this.render()),
      vscode.workspace.onDidChangeTextDocument((event) => {
        if (event.document === vscode.window.activeTextEditor?.document) this.render();
      }),
    ];
    this.render();
  }

  private render(): void {
    const editor = vscode.window.activeTextEditor;
    if (editor === undefined) return;
    const profile = this.configuration.get().accessibilityProfile;
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
    void vscode.commands.executeCommand('setContext', 'codespeak.focusProfile', profile === 'adhd');
    void vscode.commands.executeCommand(
      'setContext',
      'codespeak.voiceFirstProfile',
      profile === 'blind' || profile === 'motor',
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

  public dispose(): void {
    this.stopConfigurationListener();
    for (const subscription of this.subscriptions) subscription.dispose();
    this.activeLineDecoration.dispose();
    this.bracketDecoration.dispose();
  }
}
