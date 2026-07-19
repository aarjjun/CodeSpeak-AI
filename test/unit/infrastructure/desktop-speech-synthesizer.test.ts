import { describe, expect, it } from 'vitest';
import { createDesktopSpeechProcess } from '../../../src/infrastructure/speech/desktop-speech-synthesizer';

describe('desktop speech command factory', () => {
  it('uses a fixed PowerShell program and passes settings as arguments', () => {
    const process = createDesktopSpeechProcess('win32', { language: 'en-US', rate: 1.5 });

    expect(process.executable).toBe('powershell.exe');
    expect(process.arguments).toContain('-NoProfile');
    expect(process.arguments).toContain('en-US');
    expect(process.arguments.at(-2)).toBe('4');
    expect(process.arguments.join(' ')).not.toContain('user supplied text');
  });

  it('uses standard local speech tools on macOS and Linux', () => {
    expect(createDesktopSpeechProcess('darwin', { language: 'fr-FR', rate: 1 }).executable).toBe(
      'say',
    );
    const linux = createDesktopSpeechProcess('linux', { language: 'fr-FR', rate: 0.5 });
    expect(linux.executable).toBe('spd-say');
    expect(linux.arguments).toContain('--pipe-mode');
    expect(linux.arguments).toContain('fr-FR');
  });

  it('clamps platform rate values', () => {
    expect(
      createDesktopSpeechProcess('win32', { language: 'en-US', rate: 99 }).arguments.at(-2),
    ).toBe('10');
    expect(
      createDesktopSpeechProcess('linux', { language: 'en-US', rate: 99 }).arguments.at(-1),
    ).toBe('100');
  });
});
