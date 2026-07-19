import type { AccessibleSpeechService } from '../../application/services/accessible-speech-service';
import { CODE_SPEAK_COMMANDS } from '../commands/command-registry';

const PAGE_SIZE = 5;

export class VoiceCommandHelp {
  private offset = 0;

  public constructor(private readonly speech: AccessibleSpeechService) {}

  public async list(reset = true): Promise<void> {
    if (reset) this.offset = 0;
    if (this.offset >= CODE_SPEAK_COMMANDS.length) {
      this.offset = 0;
      await this.speech.speak(
        'That was the final command group. Say list CodeSpeak commands to start again.',
      );
      return;
    }
    const page = CODE_SPEAK_COMMANDS.slice(this.offset, this.offset + PAGE_SIZE);
    const start = this.offset + 1;
    this.offset += page.length;
    await this.speech.speak(
      `There are ${String(CODE_SPEAK_COMMANDS.length)} CodeSpeak voice commands. Commands ${String(start)} through ${String(start + page.length - 1)} are: ${page.map((item) => item.displayName).join(', ')}. ${this.offset < CODE_SPEAK_COMMANDS.length ? 'Say next commands to continue.' : 'This is the final group.'}`,
    );
  }
}
