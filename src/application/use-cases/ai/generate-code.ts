import type { AiProvider } from '../../ports/ai/ai-provider';
import type { EditorGateway } from '../../ports/platform/editor-gateway';
import type { UserInterfaceGateway } from '../../ports/platform/user-interface-gateway';
import type { AiOutputParser, AiRequest } from '../../../domain/ai/ai-contracts';
import type { GeneratedCodeResult } from '../../../domain/ai/ai-results';
import { reportAiError } from './report-ai-error';
import type { SpokenFeedback } from '../../ports/speech/spoken-feedback';

export class GenerateCode {
  public constructor(
    private readonly ai: AiProvider,
    private readonly outputParser: AiOutputParser<GeneratedCodeResult>,
    private readonly editor: EditorGateway,
    private readonly userInterface: UserInterfaceGateway,
    private readonly spokenFeedback?: SpokenFeedback,
  ) {}

  public async execute(
    initialInstruction?: string,
    confirmationAlreadyGranted = false,
  ): Promise<void> {
    const document = await this.editor.getActiveDocument();
    const selection = await this.editor.getSelection();
    if (document === undefined || selection === undefined) {
      await this.userInterface.showWarning('Open a file before generating code.');
      return;
    }

    const instruction =
      initialInstruction ??
      (await this.userInterface.requestText('Generate code with Gemini', {
        placeHolder: 'Describe the code you want to create',
      }));
    if (instruction === undefined) {
      return;
    }
    if (instruction.trim().length === 0) {
      await this.userInterface.showWarning('Describe the code you want Gemini to generate.');
      return;
    }

    const request: AiRequest = {
      capability: 'code-generation',
      promptId: 'code.generate',
      input: {
        instruction: instruction.trim(),
        languageId: document.languageId,
      },
      context:
        selection.text.trim().length === 0
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
    const result = await this.userInterface.showProgress('CodeSpeak is generating code', (signal) =>
      this.ai.generate(request, this.outputParser, signal),
    );
    if (!result.ok) {
      await reportAiError(result.error, this.userInterface, this.spokenFeedback);
      return;
    }

    await this.editor.showPreview(
      'CodeSpeak generated code',
      result.value.output.code,
      result.value.output.languageId,
    );
    if (this.spokenFeedback !== undefined) {
      await this.spokenFeedback.speak(result.value.output.explanation);
    }
    const confirmed =
      confirmationAlreadyGranted ||
      (await this.userInterface.confirm(`Insert the generated code into ${document.uri}?`));
    if (!confirmed) {
      if (this.spokenFeedback === undefined)
        await this.userInterface.announce('Generated code was not inserted.');
      else await this.spokenFeedback.speak('Generated code was not inserted.');
      return;
    }

    const applied = await this.editor.applyEdit({
      explanation: result.value.output.explanation,
      replacement: result.value.output.code,
      target: { uri: document.uri, range: selection.range },
    });
    if (!applied) {
      await this.userInterface.showError('CodeSpeak could not apply the generated code.');
      return;
    }
    if (this.spokenFeedback === undefined)
      await this.userInterface.announce('Generated code inserted.');
    else await this.spokenFeedback.speak('Generated code inserted.');
  }
}
