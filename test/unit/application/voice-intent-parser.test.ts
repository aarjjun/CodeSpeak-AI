import { describe, expect, it } from 'vitest';
import { VoiceIntentParser } from '../../../src/application/services/voice-intent-parser';

describe('VoiceIntentParser', () => {
  const parser = new VoiceIntentParser();

  it.each([
    ['Open app.py', 'open-file', { path: 'app.py' }],
    ['Go to line 50', 'go-to-line', { line: 50 }],
    ['Find function Login', 'find-symbol', { symbol: 'Login' }],
    ['Explain selected code', 'explain-selection', {}],
    ['Read current function', 'read-current-function', {}],
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
    expect(parser.parse('undo')).toMatchObject({ name: 'undo', requiresConfirmation: true });
    expect(parser.parse('redo')).toMatchObject({ name: 'redo', requiresConfirmation: true });
  });

  it('does not guess when a command is unsupported or missing a parameter', () => {
    expect(parser.parse('delete every file')).toMatchObject({ name: 'unknown' });
    expect(parser.parse('go to line')).toMatchObject({ name: 'unknown' });
  });
});
