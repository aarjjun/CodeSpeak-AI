import { spawn } from 'node:child_process';
import * as vscode from 'vscode';

export type AudioCue =
  | 'listening-started'
  | 'listening-stopped'
  | 'recognized'
  | 'failed'
  | 'confirmation'
  | 'completed';

export class AudioCueService {
  public play(cue: AudioCue): void {
    if (!vscode.workspace.getConfiguration('codespeak').get<boolean>('voice.audioCues', true))
      return;
    if (process.platform !== 'win32' || vscode.env.remoteName !== undefined) return;
    const sound =
      cue === 'failed'
        ? 'Hand'
        : cue === 'confirmation'
          ? 'Exclamation'
          : cue === 'completed'
            ? 'Asterisk'
            : 'Beep';
    const script = `[System.Media.SystemSounds]::${sound}.Play()`;
    const child = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], {
      windowsHide: true,
      stdio: 'ignore',
    });
    child.unref();
  }
}
