import type { AccessibilityProfile, AccessibilityProfileId } from './accessibility-profile';

const profiles: readonly AccessibilityProfile[] = [
  {
    id: 'blind',
    name: 'Blind Mode',
    speech: {
      enabled: true,
      rate: 1,
      language: 'en-US',
      announceProgress: true,
      autoReadSummaries: true,
    },
    reading: {
      verbosity: 'balanced',
      describePunctuation: false,
      summarizeBeforeReading: true,
      maximumItemsBeforeGrouping: 5,
    },
    interaction: {
      confirmationLevel: 'risky-actions',
      preserveFocus: true,
      reduceMotion: true,
      reduceDistractions: true,
    },
  },
  {
    id: 'low-vision',
    name: 'Low Vision Mode',
    speech: {
      enabled: false,
      rate: 1,
      language: 'en-US',
      announceProgress: true,
      autoReadSummaries: false,
    },
    reading: {
      verbosity: 'balanced',
      describePunctuation: false,
      summarizeBeforeReading: true,
      maximumItemsBeforeGrouping: 7,
    },
    interaction: {
      confirmationLevel: 'risky-actions',
      preserveFocus: true,
      reduceMotion: true,
      reduceDistractions: false,
    },
  },
  {
    id: 'dyslexia',
    name: 'Dyslexia Mode',
    speech: {
      enabled: false,
      rate: 0.9,
      language: 'en-US',
      announceProgress: true,
      autoReadSummaries: false,
    },
    reading: {
      verbosity: 'brief',
      describePunctuation: false,
      summarizeBeforeReading: true,
      maximumItemsBeforeGrouping: 5,
    },
    interaction: {
      confirmationLevel: 'risky-actions',
      preserveFocus: true,
      reduceMotion: true,
      reduceDistractions: true,
    },
  },
  {
    id: 'motor',
    name: 'Motor Accessibility Mode',
    speech: {
      enabled: true,
      rate: 1,
      language: 'en-US',
      announceProgress: true,
      autoReadSummaries: false,
    },
    reading: {
      verbosity: 'balanced',
      describePunctuation: false,
      summarizeBeforeReading: true,
      maximumItemsBeforeGrouping: 7,
    },
    interaction: {
      confirmationLevel: 'all-actions',
      preserveFocus: true,
      reduceMotion: true,
      reduceDistractions: false,
    },
  },
  {
    id: 'adhd',
    name: 'ADHD Mode',
    speech: {
      enabled: false,
      rate: 1,
      language: 'en-US',
      announceProgress: false,
      autoReadSummaries: false,
    },
    reading: {
      verbosity: 'brief',
      describePunctuation: false,
      summarizeBeforeReading: true,
      maximumItemsBeforeGrouping: 4,
    },
    interaction: {
      confirmationLevel: 'risky-actions',
      preserveFocus: true,
      reduceMotion: true,
      reduceDistractions: true,
    },
  },
  {
    id: 'custom',
    name: 'Custom Mode',
    speech: {
      enabled: false,
      rate: 1,
      language: 'en-US',
      announceProgress: true,
      autoReadSummaries: false,
    },
    reading: {
      verbosity: 'balanced',
      describePunctuation: false,
      summarizeBeforeReading: true,
      maximumItemsBeforeGrouping: 7,
    },
    interaction: {
      confirmationLevel: 'risky-actions',
      preserveFocus: true,
      reduceMotion: true,
      reduceDistractions: false,
    },
  },
];

export class AccessibilityProfileCatalog {
  public all(): readonly AccessibilityProfile[] {
    return profiles;
  }

  public get(profileId: AccessibilityProfileId): AccessibilityProfile {
    const profile = profiles.find((candidate) => candidate.id === profileId);
    if (profile !== undefined) {
      return profile;
    }
    const fallback = profiles.at(-1);
    if (fallback === undefined) {
      throw new Error('The accessibility profile catalog is empty.');
    }
    return fallback;
  }
}
