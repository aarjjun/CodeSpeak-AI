import { spawn, type ChildProcessByStdio } from 'node:child_process';
import type { Readable, Writable } from 'node:stream';
import type { SpeechSynthesizer } from '../../application/ports/speech/speech-synthesizer';
import type { OperationResult } from '../../domain/shared/operation-error';
import type { SpeechSynthesisOptions } from '../../domain/speech/speech-contracts';

export interface SpeechProcess {
  readonly executable: string;
  readonly arguments: readonly string[];
}

export function createDesktopSpeechProcess(
  platform: NodeJS.Platform,
  options: SpeechSynthesisOptions,
): SpeechProcess {
  if (platform === 'win32') {
    const rate = Math.round(Math.max(-10, Math.min(10, (options.rate - 1) * 7)));
    const script = [
      '$rate=[int]$args[0]',
      '$language=$args[1]',
      '$text=[Console]::In.ReadToEnd()',
      'Add-Type -AssemblyName System.Speech',
      '$speaker=New-Object System.Speech.Synthesis.SpeechSynthesizer',
      '$speaker.Rate=$rate',
      '$voice=$speaker.GetInstalledVoices() | Where-Object { $_.VoiceInfo.Culture.Name -eq $language } | Select-Object -First 1',
      'if ($null -ne $voice) { $speaker.SelectVoice($voice.VoiceInfo.Name) }',
      '$speaker.Speak($text)',
    ].join('; ');
    return {
      executable: 'powershell.exe',
      arguments: [
        '-NoProfile',
        '-NonInteractive',
        '-Command',
        script,
        String(rate),
        options.language,
      ],
    };
  }

  if (platform === 'darwin') {
    return {
      executable: 'say',
      arguments: ['--rate', String(Math.round(180 * options.rate))],
    };
  }

  const rate = Math.round(Math.max(-100, Math.min(100, (options.rate - 1) * 70)));
  return {
    executable: 'spd-say',
    arguments: ['--wait', '--pipe-mode', '--language', options.language, '--rate', String(rate)],
  };
}

export class DesktopSpeechSynthesizer implements SpeechSynthesizer {
  private activeProcess: ChildProcessByStdio<Writable, null, Readable> | undefined;

  public constructor(private readonly localExtensionHost: boolean) {}

  public async speak(
    text: string,
    options: SpeechSynthesisOptions,
    signal?: AbortSignal,
  ): Promise<OperationResult<void>> {
    const spokenText = text.trim();
    if (spokenText.length === 0) {
      return { ok: true, value: undefined };
    }
    if (!this.localExtensionHost) {
      return this.failure(
        'Speech output is unavailable in remote extension hosts. Use the screen reader announcement or run CodeSpeak locally.',
      );
    }
    if (signal?.aborted === true) {
      return this.cancelled();
    }

    await this.stop();
    const command = createDesktopSpeechProcess(process.platform, options);
    return new Promise((resolve) => {
      const child = spawn(command.executable, [...command.arguments], {
        stdio: ['pipe', 'ignore', 'pipe'],
        windowsHide: true,
      });
      this.activeProcess = child;
      let errorText = '';
      let settled = false;

      const finish = (result: OperationResult<void>): void => {
        if (settled) {
          return;
        }
        settled = true;
        signal?.removeEventListener('abort', abort);
        if (this.activeProcess === child) {
          this.activeProcess = undefined;
        }
        resolve(result);
      };
      const abort = (): void => {
        child.kill();
        finish(this.cancelled());
      };

      signal?.addEventListener('abort', abort, { once: true });
      child.stderr.on('data', (chunk: Buffer) => {
        if (errorText.length < 2_000) {
          errorText += chunk.toString('utf8');
        }
      });
      child.once('error', (error) => {
        finish(
          this.failure(
            process.platform === 'linux'
              ? 'Speech Dispatcher is unavailable. Install spd-say or use your screen reader.'
              : 'The operating system speech service could not start.',
            error.message,
          ),
        );
      });
      child.once('close', (code) => {
        finish(
          code === 0
            ? { ok: true, value: undefined }
            : this.failure(
                'Speech output failed.',
                errorText.trim() || `Exit code ${String(code)}`,
              ),
        );
      });
      child.stdin.on('error', () => {
        // Process failures are reported through the error or close event.
      });
      child.stdin.end(spokenText, 'utf8');
    });
  }

  public stop(): Promise<void> {
    const child = this.activeProcess;
    this.activeProcess = undefined;
    if (child !== undefined && !child.killed) {
      child.kill();
    }
    return Promise.resolve();
  }

  private failure(message: string, technicalMessage?: string): OperationResult<void> {
    return {
      ok: false,
      error: {
        code: 'speech-failure',
        message,
        ...(technicalMessage === undefined ? {} : { technicalMessage }),
        retryable: true,
        recoveryActions: [],
      },
    };
  }

  private cancelled(): OperationResult<void> {
    return {
      ok: false,
      error: {
        code: 'cancelled',
        message: 'Speech output cancelled.',
        retryable: true,
        recoveryActions: [],
      },
    };
  }
}
