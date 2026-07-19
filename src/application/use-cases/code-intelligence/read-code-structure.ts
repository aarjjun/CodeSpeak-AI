import type { CodeParser } from '../../ports/parsing/code-parser';
import type { EditorGateway } from '../../ports/platform/editor-gateway';
import type { UserInterfaceGateway } from '../../ports/platform/user-interface-gateway';
import type { AccessibilityProfileService } from '../../services/accessibility-profile-service';
import type { StructuralSummaryFormatter } from '../../services/structural-summary-formatter';
import type { SpeechSynthesizer } from '../../ports/speech/speech-synthesizer';

export class ReadCodeStructure {
  public constructor(
    private readonly parser: CodeParser,
    private readonly profiles: AccessibilityProfileService,
    private readonly formatter: StructuralSummaryFormatter,
    private readonly editor: EditorGateway,
    private readonly userInterface: UserInterfaceGateway,
    private readonly speech: SpeechSynthesizer,
  ) {}

  public async execute(readAloud = false): Promise<void> {
    const document = await this.editor.getActiveDocument();
    const selection = await this.editor.getSelection();
    if (document === undefined) {
      await this.userInterface.showWarning(
        'Open a supported code file before reading its structure.',
      );
      return;
    }

    const result = await this.userInterface.showProgress(
      'CodeSpeak is analyzing code structure',
      (signal) => this.parser.parse(document, signal),
    );
    if (!result.ok) {
      if (result.error.code === 'cancelled') {
        await this.userInterface.announce('Code structure analysis cancelled.');
      } else {
        await this.userInterface.showWarning(result.error.message);
      }
      return;
    }

    const summary = this.formatter.format(
      result.value,
      this.profiles.current(),
      selection?.range.start,
    );
    const content = [`# ${summary.title}`, '', ...summary.lines].join('\n');
    await this.editor.showPreview(summary.title, content, 'markdown');
    await this.userInterface.announce([summary.title, summary.lines[0]].filter(Boolean).join('. '));
    const speechPreferences = this.profiles.current().speech;
    if (readAloud || (speechPreferences.enabled && speechPreferences.autoReadSummaries)) {
      const speechResult = await this.speech.speak([summary.title, ...summary.lines].join('. '), {
        language: speechPreferences.language,
        rate: speechPreferences.rate,
      });
      if (!speechResult.ok && speechResult.error.code !== 'cancelled') {
        await this.userInterface.showWarning(speechResult.error.message);
      }
    }
  }
}
