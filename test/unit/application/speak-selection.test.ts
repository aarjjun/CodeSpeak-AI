import { describe, expect, it, vi } from 'vitest';
import type { ConfigurationGateway } from '../../../src/application/ports/platform/configuration-gateway';
import type { EditorGateway } from '../../../src/application/ports/platform/editor-gateway';
import type { UserInterfaceGateway } from '../../../src/application/ports/platform/user-interface-gateway';
import type { SpeechSynthesizer } from '../../../src/application/ports/speech/speech-synthesizer';
import { AccessibilityProfileService } from '../../../src/application/services/accessibility-profile-service';
import { SpeakSelection } from '../../../src/application/use-cases/speech/speak-selection';
import { AccessibilityProfileCatalog } from '../../../src/domain/accessibility/accessibility-profile-catalog';

function profiles(): AccessibilityProfileService {
  const configuration: ConfigurationGateway = {
    get: () => ({
      model: 'gemini-3.5-flash',
      openAiModel: 'gpt-5.6-sol',
      voiceLanguage: 'en-IN',
      voiceLanguageConfigured: true,
      voiceRate: 1.25,
      voiceRateConfigured: true,
      accessibilityProfile: 'blind',
      autoExplainErrors: false,
      autoReadSummaries: true,
      autoReadSummariesConfigured: true,
    }),
    setAccessibilityProfile: () => Promise.resolve(),
    onDidChange: () => () => undefined,
  };
  return new AccessibilityProfileService(configuration, new AccessibilityProfileCatalog());
}

function editor(text: string): EditorGateway {
  return {
    getActiveDocument: () => Promise.resolve(undefined),
    getSelection: () =>
      Promise.resolve({
        text,
        range: {
          start: { line: 0, character: 0 },
          end: { line: 0, character: text.length },
        },
      }),
    insertText: () => Promise.resolve(false),
    applyEdit: () => Promise.resolve(false),
    showPreview: () => Promise.resolve(),
    openDocument: () => Promise.resolve(false),
    revealPosition: () => Promise.resolve(),
    undo: () => Promise.resolve(),
    redo: () => Promise.resolve(),
  };
}

function userInterface(showWarning = vi.fn()): UserInterfaceGateway {
  return {
    announce: () => Promise.resolve(),
    showInformation: () => Promise.resolve(),
    showWarning,
    showError: () => Promise.resolve(),
    choose: () => Promise.resolve(undefined),
    requestText: () => Promise.resolve(undefined),
    confirm: () => Promise.resolve(false),
    showProgress: (_title, operation) => operation(new AbortController().signal),
  };
}

describe('SpeakSelection', () => {
  it('uses profile speech preferences for selected text', async () => {
    const speak = vi.fn().mockResolvedValue({ ok: true, value: undefined });
    const speech: SpeechSynthesizer = { speak, stop: () => Promise.resolve() };
    await new SpeakSelection(
      speech,
      profiles(),
      editor('const answer = 42;'),
      userInterface(),
    ).execute();
    expect(speak).toHaveBeenCalledWith(
      'const answer = 42;',
      { language: 'en-IN', rate: 1.25 },
      expect.any(AbortSignal),
    );
  });

  it('warns without invoking speech when no text is selected', async () => {
    const speak = vi.fn();
    const warning = vi.fn().mockResolvedValue(undefined);
    await new SpeakSelection(
      { speak, stop: () => Promise.resolve() },
      profiles(),
      editor('  '),
      userInterface(warning),
    ).execute();
    expect(speak).not.toHaveBeenCalled();
    expect(warning).toHaveBeenCalledWith('Select text to read aloud.');
  });
});
