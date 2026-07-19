import type * as vscode from 'vscode';
import type { StateStore } from '../../application/ports/persistence/persistence-ports';

export class VsCodeStateStore implements StateStore {
  public constructor(private readonly state: vscode.Memento) {}

  public get<T>(key: string, defaultValue: T): T {
    return this.state.get(key, defaultValue);
  }

  public async set(key: string, value: unknown): Promise<void> {
    await this.state.update(key, value);
  }
}
