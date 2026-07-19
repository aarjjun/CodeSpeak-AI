import type { EditorGateway } from '../../ports/platform/editor-gateway';
import type { UserInterfaceGateway } from '../../ports/platform/user-interface-gateway';
import type { SpeechSynthesizer } from '../../ports/speech/speech-synthesizer';
import type { AccessibilityProfileService } from '../../services/accessibility-profile-service';

export class SpeakSelection {
  public constructor(
    private readonly speech: SpeechSynthesizer,
    private readonly profiles: AccessibilityProfileService,
    private readonly editor: EditorGateway,
    private readonly userInterface: UserInterfaceGateway,
  ) {}

  public async execute(): Promise<void> {
    const selection = await this.editor.getSelection();
    if (selection === undefined || selection.text.trim().length === 0) {
      await this.userInterface.showWarning('Select text to read aloud.');
      return;
    }
    const preferences = this.profiles.current().speech;
    const result = await this.userInterface.showProgress(
      'CodeSpeak is reading the selection',
      (signal) =>
        this.speech.speak(
          selection.text,
          {
            language: preferences.language,
            rate: preferences.rate,
          },
          signal,
        ),
    );
    if (!result.ok && result.error.code !== 'cancelled') {
      await this.userInterface.showWarning(result.error.message);
    }
  }
}
