import type { AccessibilityAnalyzer } from '../../ports/accessibility/accessibility-analyzer';
import type { AccessibilityReportGateway } from '../../ports/accessibility/accessibility-report-gateway';
import type { EditorGateway } from '../../ports/platform/editor-gateway';
import type { UserInterfaceGateway } from '../../ports/platform/user-interface-gateway';

export class CheckActiveDocumentAccessibility {
  public constructor(
    private readonly analyzer: AccessibilityAnalyzer,
    private readonly reports: AccessibilityReportGateway,
    private readonly editor: EditorGateway,
    private readonly userInterface: UserInterfaceGateway,
  ) {}

  public async execute(): Promise<void> {
    const document = await this.editor.getActiveDocument();
    if (document === undefined) {
      await this.userInterface.showWarning('Open a JSX or TSX file before checking accessibility.');
      return;
    }

    const result = await this.userInterface.showProgress(
      'CodeSpeak is checking accessibility',
      (signal) => this.analyzer.analyze(document, 'WCAG-2.2-AA', signal),
    );
    if (!result.ok) {
      if (result.error.code === 'cancelled') {
        await this.userInterface.announce('Accessibility check cancelled.');
      } else {
        await this.userInterface.showWarning(result.error.message);
      }
      return;
    }

    this.reports.publish(result.value);
    const issues = result.value.issues;
    const content = [
      '# Accessibility check',
      '',
      `Standard: ${result.value.standard}`,
      `Issues found: ${issues.length.toString()}`,
      '',
      ...issues.flatMap((issue, index) => [
        `## ${(index + 1).toString()}. ${issue.message}`,
        '',
        `Rule: ${issue.ruleId}`,
        `Severity: ${issue.severity}`,
        `Line: ${(issue.range.start.line + 1).toString()}`,
        `Fix: ${issue.remediation}`,
        '',
      ]),
    ].join('\n');
    await this.editor.showPreview('CodeSpeak accessibility check', content, 'markdown');
    await this.userInterface.announce(
      issues.length === 0
        ? 'No accessibility issues found by the current CodeSpeak rules.'
        : `${issues.length.toString()} accessibility issues found. Findings are also available in the Problems panel.`,
    );
  }
}
