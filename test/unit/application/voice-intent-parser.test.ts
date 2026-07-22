import { describe, expect, it } from 'vitest';
import { VoiceIntentParser } from '../../../src/application/services/voice-intent-parser';

describe('VoiceIntentParser', () => {
  const parser = new VoiceIntentParser();

  it.each([
    ['Open app.py', 'open-file', { path: 'app.py' }],
    ['Go to line 50', 'go-to-line', { line: 50 }],
    ['Find function Login', 'find-symbol', { symbol: 'Login' }],
    ['Explain selected code', 'codespeak-command', { commandId: 'codespeak.explainSelection' }],
    ['Explain current error', 'codespeak-command', { commandId: 'codespeak.explainDiagnostic' }],
    ['Summarize this file', 'codespeak-command', { commandId: 'codespeak.summarizeFile' }],
    ['Check accessibility', 'codespeak-command', { commandId: 'codespeak.checkAccessibility' }],
    ['Start focus timer', 'codespeak-command', { commandId: 'codespeak.focus.startTimer' }],
    ['Read current function', 'codespeak-command', { commandId: 'codespeak.readCodeStructure' }],
  ] as const)('maps %s to an allowlisted intent', (transcript, name, parameters) => {
    expect(parser.parse(transcript)).toMatchObject({ name, parameters });
  });

  it('preserves the code instruction and requires confirmation', () => {
    expect(parser.parse('Create a Python function that checks if a number is prime')).toMatchObject(
      {
        name: 'create-code',
        parameters: { instruction: 'a Python function that checks if a number is prime' },
        requiresConfirmation: true,
      },
    );
  });

  it('requires confirmation for editor history mutations', () => {
    expect(parser.parse('undo')).toMatchObject({
      name: 'codespeak-command',
      parameters: { commandId: 'codespeak.undo' },
      requiresConfirmation: true,
    });
    expect(parser.parse('redo')).toMatchObject({
      name: 'codespeak-command',
      parameters: { commandId: 'codespeak.redo' },
      requiresConfirmation: true,
    });
  });

  it('does not guess when a command is unsupported or missing a parameter', () => {
    expect(parser.parse('delete every file')).toMatchObject({ name: 'unknown' });
    expect(parser.parse('go to line')).toMatchObject({ name: 'unknown' });
  });

  it.each([
    ['read line twenty six', 'read-line', { line: 26 }],
    ['read line 26', 'read-line', { line: 26 }],
    ['reed line twenty-six', 'read-line', { line: 26 }],
    ['read lines 26 to 30', 'read-line-range', { start: 26, end: 30 }],
    ['type hello world', 'dictation', { text: 'hello world' }],
    ['open the folder', 'codespeak-command', { commandId: 'codespeak.openFolder' }],
    ['ask copilot to refactor this function', 'copilot-chat', { prompt: 'refactor this function' }],
    ['ask gemini what is recursion', 'gemini-chat', { prompt: 'what is recursion' }],
    ['use gemini to explain closures', 'gemini-chat', { prompt: 'explain closures' }],
    ['send this question to gemini', 'gemini-chat', { prompt: 'this question' }],
    ['code speak summarize file', 'codespeak-command', { commandId: 'codespeak.summarizeFile' }],
  ] as const)('classifies Blind Mode phrase %s', (transcript, name, parameters) => {
    expect(parser.parse(transcript)).toMatchObject({ name, parameters });
  });
});
