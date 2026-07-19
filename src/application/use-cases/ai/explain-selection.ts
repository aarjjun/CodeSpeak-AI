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
    if (document === undefined || selection === undefined || selection.text.trim().length === 0) {
      await this.userInterface.showWarning('Select code before asking CodeSpeak to explain it.');
      return;
    }

    const request: AiRequest = {
      capability: 'code-explanation',
      promptId: 'code.explain',
      input: { languageId: document.languageId },
      context: [
        {
          kind: 'selection',
          content: selection.text,
          languageId: document.languageId,
          source: { uri: document.uri, range: selection.range },
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
      ...(explanation.considerations.length === 0
        ? []
        : ['', '## Considerations', ...explanation.considerations.map((item) => `- ${item}`)]),
    ].join('\n');
    await this.editor.showPreview('CodeSpeak explanation', content, 'markdown');
    await this.userInterface.announce(explanation.summary);
  }
}
