import type { AiProvider } from '../../ports/ai/ai-provider';
import type { EditorGateway } from '../../ports/platform/editor-gateway';
import type { UserInterfaceGateway } from '../../ports/platform/user-interface-gateway';
import type { AiOutputParser, AiRequest } from '../../../domain/ai/ai-contracts';
import type { DocumentationGenerationResult } from '../../../domain/ai/ai-results';
import { reportAiError } from './report-ai-error';
import type { SpokenFeedback } from '../../ports/speech/spoken-feedback';

const STYLES: Readonly<Record<string, DocumentationGenerationResult['style']>> = {
  python: 'docstring',
  javascript: 'jsdoc',
  javascriptreact: 'jsdoc',
  typescript: 'jsdoc',
  typescriptreact: 'jsdoc',
  java: 'javadoc',
  cpp: 'doxygen',
  c: 'doxygen',
};

export class GenerateDocumentation {
  public constructor(
    private readonly ai: AiProvider,
    private readonly outputParser: AiOutputParser<DocumentationGenerationResult>,
    private readonly editor: EditorGateway,
    private readonly userInterface: UserInterfaceGateway,
    private readonly spokenFeedback?: SpokenFeedback,
  ) {}

  public async execute(confirmationAlreadyGranted = false): Promise<void> {
    const document = await this.editor.getActiveDocument();
    const selection = await this.editor.getSelection();
    if (document === undefined || selection === undefined || selection.text.trim().length === 0) {
      await this.userInterface.showWarning('Select code before generating documentation.');
      return;
    }

    const style = STYLES[document.languageId];
    if (style === undefined) {
      await this.userInterface.showWarning(
        `Documentation generation does not yet support ${document.languageId}.`,
      );
      return;
    }

    const request: AiRequest = {
      capability: 'documentation-generation',
      promptId: 'documentation.generate',
      input: { languageId: document.languageId, style },
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
      'CodeSpeak is generating documentation',
      (signal) => this.ai.generate(request, this.outputParser, signal),
    );
    if (!result.ok) {
      await reportAiError(result.error, this.userInterface, this.spokenFeedback);
      return;
    }

    const generated = result.value.output;
    await this.editor.showPreview(
      'CodeSpeak generated documentation',
      generated.usageExample === undefined
        ? generated.documentation
        : `${generated.documentation}\n\nUsage example:\n${generated.usageExample}`,
      'markdown',
    );
    if (this.spokenFeedback !== undefined) {
      await this.spokenFeedback.speak(generated.explanation);
    }
    const confirmed =
      confirmationAlreadyGranted ||
      (await this.userInterface.confirm(
        `Insert the generated ${generated.style} before the selected code?`,
      ));
    if (!confirmed) {
      if (this.spokenFeedback === undefined)
        await this.userInterface.announce('Generated documentation was not inserted.');
      else await this.spokenFeedback.speak('Generated documentation was not inserted.');
      return;
    }

    const insertionPoint = selection.range.start;
    const applied = await this.editor.applyEdit({
      explanation: generated.explanation,
      replacement: `${generated.documentation}\n`,
      target: {
        uri: document.uri,
        range: { start: insertionPoint, end: insertionPoint },
      },
    });
    if (!applied) {
      await this.userInterface.showError('CodeSpeak could not insert the generated documentation.');
      return;
    }
    if (this.spokenFeedback === undefined)
      await this.userInterface.announce('Generated documentation inserted.');
    else await this.spokenFeedback.speak('Generated documentation inserted.');
  }
}
