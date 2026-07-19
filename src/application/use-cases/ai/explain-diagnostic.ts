import type { AiProvider } from '../../ports/ai/ai-provider';
import type { DiagnosticsGateway } from '../../ports/platform/diagnostics-gateway';
import type { EditorGateway } from '../../ports/platform/editor-gateway';
import type { UserInterfaceGateway } from '../../ports/platform/user-interface-gateway';
import type { AiOutputParser, AiRequest } from '../../../domain/ai/ai-contracts';
import type { DiagnosticExplanationResult } from '../../../domain/ai/ai-results';
import type { CodeDiagnostic } from '../../../domain/diagnostics/diagnostic-contracts';
import { reportAiError } from './report-ai-error';

export class ExplainDiagnostic {
  public constructor(
    private readonly ai: AiProvider,
    private readonly outputParser: AiOutputParser<DiagnosticExplanationResult>,
    private readonly diagnostics: DiagnosticsGateway,
    private readonly editor: EditorGateway,
    private readonly userInterface: UserInterfaceGateway,
  ) {}

  public async execute(): Promise<void> {
    const document = await this.editor.getActiveDocument();
    const available =
      document === undefined
        ? this.diagnostics.getForWorkspace()
        : this.diagnostics.getForDocument(document.uri);
    if (available.length === 0) {
      await this.userInterface.showInformation('No diagnostics are available to explain.');
      return;
    }

    const selection = await this.editor.getSelection();
    const currentLine = selection?.range.start.line;
    const currentDiagnostics =
      currentLine === undefined
        ? []
        : available.filter((item) => {
            const range = item.location.range;
            return (
              range !== undefined &&
              range.start.line <= currentLine &&
              range.end.line >= currentLine
            );
          });
    let diagnostic = currentDiagnostics.length === 1 ? currentDiagnostics[0] : undefined;
    if (diagnostic === undefined) {
      const selectedId = await this.userInterface.choose(
        'Choose a diagnostic to explain',
        available.slice(0, 100).map((candidate) => ({
          id: candidate.id,
          label: `${candidate.severity}: ${candidate.message}`,
          description: this.locationLabel(candidate),
        })),
      );
      diagnostic = available.find((item) => item.id === selectedId);
    }
    if (diagnostic === undefined) {
      return;
    }

    const request: AiRequest = {
      capability: 'diagnostic-explanation',
      promptId: 'diagnostic.explain',
      input: {
        message: diagnostic.message,
        severity: diagnostic.severity,
        source: diagnostic.source ?? 'unknown',
        code: diagnostic.code ?? 'unknown',
      },
      context: [
        {
          kind: 'diagnostic',
          content: diagnostic.message,
          source: diagnostic.location,
        },
      ],
    };
    const result = await this.userInterface.showProgress(
      'CodeSpeak is explaining the diagnostic',
      (signal) => this.ai.generate(request, this.outputParser, signal),
    );
    if (!result.ok) {
      await reportAiError(result.error, this.userInterface);
      return;
    }

    const explanation = result.value.output;
    const content = [
      '# Diagnostic explanation',
      '',
      explanation.plainLanguageExplanation,
      '',
      '## Likely cause',
      explanation.likelyCause,
      '',
      '## Suggested next steps',
      ...explanation.suggestedNextSteps.map((step) => `- ${step}`),
    ].join('\n');
    await this.editor.showPreview('CodeSpeak diagnostic explanation', content, 'markdown');
    await this.userInterface.announce(explanation.plainLanguageExplanation);
  }

  private locationLabel(diagnostic: CodeDiagnostic): string {
    const line = diagnostic.location.range?.start.line;
    return line === undefined
      ? diagnostic.location.uri
      : `${diagnostic.location.uri}, line ${(line + 1).toString()}`;
  }
}
