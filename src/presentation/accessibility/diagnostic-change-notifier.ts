import * as vscode from 'vscode';
import type { ConfigurationGateway } from '../../application/ports/platform/configuration-gateway';
import type { UserInterfaceGateway } from '../../application/ports/platform/user-interface-gateway';

const DEBOUNCE_MILLISECONDS = 750;

export class DiagnosticChangeNotifier implements vscode.Disposable {
  private readonly subscription: vscode.Disposable;
  private timer: NodeJS.Timeout | undefined;
  private previousErrorCount = 0;

  public constructor(
    private readonly configuration: ConfigurationGateway,
    private readonly userInterface: UserInterfaceGateway,
  ) {
    this.previousErrorCount = this.errorCount();
    this.subscription = vscode.languages.onDidChangeDiagnostics(() => this.schedule());
  }

  private schedule(): void {
    if (this.timer !== undefined) {
      clearTimeout(this.timer);
    }
    this.timer = setTimeout(() => {
      this.timer = undefined;
      void this.reportNewErrors();
    }, DEBOUNCE_MILLISECONDS);
  }

  private async reportNewErrors(): Promise<void> {
    const currentErrorCount = this.errorCount();
    const hasNewErrors = currentErrorCount > this.previousErrorCount;
    this.previousErrorCount = currentErrorCount;
    if (!hasNewErrors || !this.configuration.get().autoExplainErrors) {
      return;
    }
    await this.userInterface.announce(
      `${currentErrorCount.toString()} workspace errors are available. Run “CodeSpeak AI: Explain Diagnostic” for a plain-language explanation.`,
      'assertive',
    );
  }

  private errorCount(): number {
    return vscode.languages
      .getDiagnostics()
      .flatMap(([, diagnostics]) => diagnostics)
      .filter((diagnostic) => diagnostic.severity === vscode.DiagnosticSeverity.Error).length;
  }

  public dispose(): void {
    if (this.timer !== undefined) {
      clearTimeout(this.timer);
    }
    this.subscription.dispose();
  }
}
