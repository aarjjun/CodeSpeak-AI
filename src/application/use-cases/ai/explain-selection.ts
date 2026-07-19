import type { AiProvider } from '../../ports/ai/ai-provider';
import type { EditorGateway } from '../../ports/platform/editor-gateway';
import type { UserInterfaceGateway } from '../../ports/platform/user-interface-gateway';
import type { AiOutputParser, AiRequest } from '../../../domain/ai/ai-contracts';
import type { CodeExplanationResult } from '../../../domain/ai/ai-results';
import { reportAiError } from './report-ai-error';

export class ExplainSelection {
  public constructor(
    private readonly ai: AiProvider,
    private readonly outputParser: AiOutputParser<CodeExplanationResult>,
    private readonly editor: EditorGateway,
    private readonly userInterface: UserInterfaceGateway,
  ) {}

  public async execute(): Promise<void> {
    const document = await this.editor.getActiveDocument();
    const selection = await this.editor.getSelection();
    if (document === undefined || selection === undefined) {
      await this.userInterface.showWarning('Open a file before asking CodeSpeak to explain code.');
      return;
    }

    const context = this.selectionOrCurrentLine(document.content, selection);

    const request: AiRequest = {
      capability: 'code-explanation',
      promptId: 'code.explain',
      input: { languageId: document.languageId },
      context: [
        {
          kind: 'selection',
          content: context.text,
          languageId: document.languageId,
          source: { uri: document.uri, range: context.range },
        },
      ],
    };
    const result = await this.userInterface.showProgress(
      'CodeSpeak is explaining the selection',
      (signal) => this.ai.generate(request, this.outputParser, signal),
    );
    if (!result.ok) {
      await reportAiError(result.error, this.userInterface);
      return;
    }

    const explanation = result.value.output;
    const content = [
      '# Code explanation',
      '',
      explanation.summary,
      '',
      '## Details',
      ...explanation.details.map((detail) => `- ${detail}`),
      '',
      '## Why this works',
      explanation.whyItWorks,
      ...(explanation.alternatives.length === 0
        ? []
        : ['', '## Alternatives', ...explanation.alternatives.map((item) => `- ${item}`)]),
      ...(explanation.considerations.length === 0
        ? []
        : ['', '## Considerations', ...explanation.considerations.map((item) => `- ${item}`)]),
    ].join('\n');
    await this.editor.showPreview('CodeSpeak explanation', content, 'markdown');
    await this.userInterface.announce(explanation.summary);
  }

  private selectionOrCurrentLine(
    documentContent: string,
    selection: Awaited<ReturnType<EditorGateway['getSelection']>> & {},
  ): { readonly text: string; readonly range: typeof selection.range } {
    if (selection.text.trim().length > 0) return selection;
    const lines = documentContent.split(/\r?\n/u);
    const line = lines[selection.range.start.line] ?? '';
    return {
      text: line,
      range: {
        start: { line: selection.range.start.line, character: 0 },
        end: { line: selection.range.start.line, character: line.length },
      },
    };
  }
}
