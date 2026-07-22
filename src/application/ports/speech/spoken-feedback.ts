export type SpeechPriority = 'normal' | 'critical';

export interface SpokenFeedback {
  speak(message: string, priority?: SpeechPriority): Promise<void>;
}
