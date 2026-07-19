import type { AiProvider } from '../../ports/ai/ai-provider';
import type { EditorGateway } from '../../ports/platform/editor-gateway';
import type { UserInterfaceGateway } from '../../ports/platform/user-interface-gateway';
import type { AiOutputParser, AiRequest } from '../../../domain/ai/ai-contracts';
import type { LearningAssistanceResult } from '../../../domain/ai/ai-results';
import { reportAiError } from './report-ai-error';

export class AssistLearning {
  public constructor(
    private readonly ai: AiProvider,
    private readonly outputParser: AiOutputParser<LearningAssistanceResult>,
    private readonly editor: EditorGateway,
    private readonly userInterface: UserInterfaceGateway,
  ) {}

  public async execute(initialQuestion?: string): Promise<void> {
    const question =
      initialQuestion ??
      (await this.userInterface.requestText('Ask CodeSpeak', {
        placeHolder: 'For example: What is recursion?',
      }));
    if (question === undefined) return;
    if (question.trim().length === 0) {
      await this.userInterface.showWarning('Enter a programming question before asking CodeSpeak.');
      return;
    }
    const document = await this.editor.getActiveDocument();
    const selection = await this.editor.getSelection();
    const request: AiRequest = {
      capability: 'learning-assistance',
      promptId: 'learning.assist',
      input: { question: question.trim(), languageId: document?.languageId ?? 'plain-text' },
      context:
        selection === undefined || selection.text.trim().length === 0 || document === undefined
          ? []
          : [
              {
                kind: 'selection',
                content: selection.text,
                languageId: document.languageId,
                source: { uri: document.uri, range: selection.range },
              },
            ],
    };
    const result = await this.userInterface.showProgress(
      'CodeSpeak is preparing a learning activity',
      (signal) => this.ai.generate(request, this.outputParser, signal),
    );
    if (!result.ok) {
      await reportAiError(result.error, this.userInterface);
      return;
    }
    const learning = result.value.output;
    await this.editor.showPreview(
      'CodeSpeak learning activity',
      [
        '# Learning activity',
        '',
        '## Explanation',
        learning.explanation,
        '',
        '## Example',
        '```',
        learning.example,
        '```',
        '',
        '## Practice exercise',
        learning.exercise,
        '',
        '## Feedback',
        learning.feedback,
      ].join('\n'),
      'markdown',
    );
    await this.userInterface.announce(learning.explanation);
  }
}
