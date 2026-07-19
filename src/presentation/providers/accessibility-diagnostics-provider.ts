import * as vscode from 'vscode';
import type { AccessibilityReportGateway } from '../../application/ports/accessibility/accessibility-report-gateway';
import type {
  AccessibilityAuditReport,
  AccessibilityIssueSeverity,
} from '../../domain/accessibility/accessibility-audit';
import type { DocumentUri } from '../../domain/shared/source-location';

export class AccessibilityDiagnosticsProvider
  implements AccessibilityReportGateway, vscode.Disposable
{
  private readonly collection =
    vscode.languages.createDiagnosticCollection('codespeak-accessibility');

  public publish(report: AccessibilityAuditReport): void {
    const diagnostics = report.issues.map((issue) => {
      const diagnostic = new vscode.Diagnostic(
        new vscode.Range(
          issue.range.start.line,
          issue.range.start.character,
          issue.range.end.line,
          issue.range.end.character,
        ),
        `${issue.message} ${issue.remediation}`,
        this.severity(issue.severity),
      );
      diagnostic.source = 'CodeSpeak Accessibility';
      diagnostic.code = {
        value: issue.ruleId,
        target: vscode.Uri.parse(issue.documentationUri ?? 'https://www.w3.org/WAI/WCAG22/'),
      };
      return diagnostic;
    });
    this.collection.set(vscode.Uri.parse(report.uri), diagnostics);
  }

  public clear(uri?: DocumentUri): void {
    if (uri === undefined) {
      this.collection.clear();
    } else {
      this.collection.delete(vscode.Uri.parse(uri));
    }
  }

  public dispose(): void {
    this.collection.dispose();
  }

  private severity(severity: AccessibilityIssueSeverity): vscode.DiagnosticSeverity {
    switch (severity) {
      case 'critical':
      case 'serious':
        return vscode.DiagnosticSeverity.Error;
      case 'moderate':
        return vscode.DiagnosticSeverity.Warning;
      case 'minor':
        return vscode.DiagnosticSeverity.Information;
    }
  }
}
