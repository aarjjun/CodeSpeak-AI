import type { SpeechSynthesizer } from '../ports/speech/speech-synthesizer';
import type { UserInterfaceGateway } from '../ports/platform/user-interface-gateway';
import type { AccessibilityProfileService } from './accessibility-profile-service';
import type { ConfigurationGateway } from '../ports/platform/configuration-gateway';

export type SpeechPriority = 'normal' | 'critical';

export class AccessibleSpeechService {
  private lastMessage: string | undefined;
  private pausedMessage: string | undefined;
  private rateAdjustment = 0;

  public constructor(
    private readonly synthesizer: SpeechSynthesizer,
    private readonly profiles: AccessibilityProfileService,
    private readonly configuration: ConfigurationGateway,
    private readonly userInterface: UserInterfaceGateway,
  ) {}

  public async speak(message: string, priority: SpeechPriority = 'normal'): Promise<void> {
    const text = message.trim();
    if (text.length === 0) return;
    if (priority === 'critical') await this.synthesizer.stop();
    this.lastMessage = text;
    this.pausedMessage = undefined;
    await this.userInterface.announce(text, priority === 'critical' ? 'assertive' : 'polite');
    const preferences = this.profiles.current().speech;
    const settings = this.configuration.get();
    if (!preferences.enabled) return;
    const result = await this.synthesizer.speak(text, {
      language: preferences.language,
      rate: Math.min(2, Math.max(0.5, preferences.rate + this.rateAdjustment)),
      ...(settings.voiceVolume === undefined ? {} : { volume: settings.voiceVolume }),
      ...(settings.voiceName === undefined ? {} : { voiceName: settings.voiceName }),
    });
    if (!result.ok && result.error.code !== 'cancelled') {
      await this.userInterface.showWarning(result.error.message);
    }
  }

  public async stop(): Promise<void> {
    this.pausedMessage = undefined;
    await this.synthesizer.stop();
    await this.userInterface.announce('Speech stopped.');
  }

  public async pause(): Promise<void> {
    this.pausedMessage = this.lastMessage;
    await this.synthesizer.stop();
    await this.userInterface.announce('Speech paused. Say continue to restart the message.');
  }

  public async resume(): Promise<void> {
    const message = this.pausedMessage;
    if (message === undefined) {
      await this.userInterface.announce('There is no paused message.');
      return;
    }
    await this.speak(message);
  }

  public async repeat(): Promise<void> {
    if (this.lastMessage === undefined) {
      await this.userInterface.announce('There is no previous spoken message.');
      return;
    }
    await this.speak(this.lastMessage);
  }

  public async adjustRate(direction: 'slower' | 'faster'): Promise<void> {
    this.rateAdjustment = Math.min(
      0.75,
      Math.max(-0.4, this.rateAdjustment + (direction === 'faster' ? 0.15 : -0.15)),
    );
    await this.userInterface.announce(`Speech will be ${direction}.`);
  }
}
