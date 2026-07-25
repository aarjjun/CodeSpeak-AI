import * as vscode from 'vscode';
import type { UserInterfaceGateway } from '../../application/ports/platform/user-interface-gateway';
import type { AccessibleSpeechService } from '../../application/services/accessible-speech-service';

type TimerPhase = 'focus' | 'break';

export class FocusTimerController implements vscode.Disposable {
  private readonly status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 98);
  private readonly configurationSubscription: vscode.Disposable;
  private timer: NodeJS.Timeout | undefined;
  private phase: TimerPhase = 'focus';
  private remainingSeconds = this.durationSeconds('focus');
  private running = false;

  public constructor(
    private readonly userInterface: UserInterfaceGateway,
    private readonly speech: AccessibleSpeechService,
  ) {
    this.status.name = 'CodeSpeak focus timer';
    this.status.command = 'codespeak.focus.pauseTimer';
    this.configurationSubscription = vscode.workspace.onDidChangeConfiguration((event) => {
      if (
        !this.running &&
        (event.affectsConfiguration('codespeak.focus.minutes') ||
          event.affectsConfiguration('codespeak.focus.breakMinutes'))
      ) {
        this.remainingSeconds = this.durationSeconds(this.phase);
        this.render();
      }
    });
    this.render();
  }
  public async start(): Promise<void> {
    if (this.running) {
      await this.userInterface.announce('Focus timer is already running.');
      return;
    }
    this.running = true;
    this.timer = setInterval(() => this.tick(), 1_000);
    this.render();
    await this.userInterface.announce(
      `${phaseName(this.phase)} timer started for ${String(this.durationMinutes(this.phase))} minutes.`,
    );
  }
  public async pause(): Promise<void> {
    if (!this.running) {
      await this.userInterface.announce('Focus timer is already paused.');
      return;
    }
    this.stopTimer();
    this.render();
    await this.userInterface.announce(`${phaseName(this.phase)} timer paused.`);
  }
  public async reset(): Promise<void> {
    this.stopTimer();
    this.phase = 'focus';
    this.remainingSeconds = this.durationSeconds('focus');
    this.render();
    await this.userInterface.announce(
      `Focus timer reset to ${String(this.durationMinutes('focus'))} minutes.`,
    );
  }
  private tick(): void {
    this.remainingSeconds -= 1;
    if (this.remainingSeconds <= 0) {
      if (this.phase === 'focus') {
        this.phase = 'break';
        this.remainingSeconds = this.durationSeconds('break');
        this.render();
        void this.speech.speakAlways(
          `Focus session complete. Break timer started for ${String(this.durationMinutes('break'))} minutes.`,
          'critical',
        );
      } else {
        this.phase = 'focus';
        this.remainingSeconds = this.durationSeconds('focus');
        this.stopTimer();
        this.render();
        void this.userInterface.announce(
          'Break complete. The focus timer is ready for a new session.',
          'assertive',
        );
      }
      return;
    }
    this.render();
  }
  private stopTimer(): void {
    if (this.timer !== undefined) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
    this.running = false;
  }
  private render(): void {
    const minutes = Math.floor(this.remainingSeconds / 60);
    const seconds = this.remainingSeconds % 60;
    const time = `${minutes.toString()}:${seconds.toString().padStart(2, '0')}`;
    const phase = phaseName(this.phase);
    this.status.text = `$(watch) ${phase} ${time}`;
    this.status.accessibilityInformation = {
      label: `CodeSpeak ${phase.toLocaleLowerCase()} timer, ${time} remaining, ${this.running ? 'running' : 'paused'}.`,
      role: 'status',
    };
    this.status.show();
  }
  private durationMinutes(phase: TimerPhase): number {
    const key = phase === 'focus' ? 'minutes' : 'breakMinutes';
    const fallback = 5;
    const configured = vscode.workspace
      .getConfiguration('codespeak.focus')
      .get<number>(key, fallback);
    return Math.min(120, Math.max(1, Math.round(configured)));
  }
  private durationSeconds(phase: TimerPhase): number {
    return this.durationMinutes(phase) * 60;
  }
  public dispose(): void {
    this.stopTimer();
    this.configurationSubscription.dispose();
    this.status.dispose();
  }
}

function phaseName(phase: TimerPhase): 'Focus' | 'Break' {
  return phase === 'focus' ? 'Focus' : 'Break';
}
