import * as vscode from 'vscode';
import type { UserInterfaceGateway } from '../../application/ports/platform/user-interface-gateway';

const DEFAULT_MINUTES = 25;

export class FocusTimerController implements vscode.Disposable {
  private readonly status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 98);
  private timer: NodeJS.Timeout | undefined;
  private remainingSeconds = DEFAULT_MINUTES * 60;
  private running = false;

  public constructor(private readonly userInterface: UserInterfaceGateway) {
    this.status.name = 'CodeSpeak focus timer';
    this.status.command = 'codespeak.focus.pauseTimer';
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
    await this.userInterface.announce('Focus timer started for 25 minutes.');
  }
  public async pause(): Promise<void> {
    if (!this.running) {
      await this.userInterface.announce('Focus timer is already paused.');
      return;
    }
    this.stopTimer();
    this.render();
    await this.userInterface.announce('Focus timer paused.');
  }
  public async reset(): Promise<void> {
    this.stopTimer();
    this.remainingSeconds = DEFAULT_MINUTES * 60;
    this.render();
    await this.userInterface.announce('Focus timer reset to 25 minutes.');
  }
  private tick(): void {
    this.remainingSeconds -= 1;
    if (this.remainingSeconds <= 0) {
      this.remainingSeconds = DEFAULT_MINUTES * 60;
      this.stopTimer();
      this.render();
      void this.userInterface.announce('Focus session complete. Take a short break.', 'assertive');
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
    this.status.text = `$(watch) Focus ${time}`;
    this.status.accessibilityInformation = {
      label: `CodeSpeak focus timer, ${time} remaining, ${this.running ? 'running' : 'paused'}.`,
      role: 'status',
    };
    this.status.show();
  }
  public dispose(): void {
    this.stopTimer();
    this.status.dispose();
  }
}
