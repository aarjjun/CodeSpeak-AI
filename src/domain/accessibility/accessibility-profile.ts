export type AccessibilityProfileId = 'blind' | 'low-vision' | 'dyslexia' | 'adhd' | 'custom';

export type ContentVerbosity = 'brief' | 'balanced' | 'detailed';
export type ConfirmationLevel = 'minimal' | 'risky-actions' | 'all-actions';

export interface SpeechPreferences {
  readonly enabled: boolean;
  readonly rate: number;
  readonly language: string;
  readonly announceProgress: boolean;
  readonly autoReadSummaries: boolean;
}

export interface ReadingPreferences {
  readonly verbosity: ContentVerbosity;
  readonly describePunctuation: boolean;
  readonly summarizeBeforeReading: boolean;
  readonly maximumItemsBeforeGrouping: number;
}

export interface InteractionPreferences {
  readonly confirmationLevel: ConfirmationLevel;
  readonly preserveFocus: boolean;
  readonly reduceMotion: boolean;
  readonly reduceDistractions: boolean;
}

export interface AccessibilityProfile {
  readonly id: AccessibilityProfileId;
  readonly name: string;
  readonly speech: SpeechPreferences;
  readonly reading: ReadingPreferences;
  readonly interaction: InteractionPreferences;
}
