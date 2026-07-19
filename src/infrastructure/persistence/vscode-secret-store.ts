import type * as vscode from 'vscode';
import type { SecretStore } from '../../application/ports/persistence/persistence-ports';

export class VsCodeSecretStore implements SecretStore {
  public constructor(private readonly secrets: vscode.SecretStorage) {}

  public async get(key: string): Promise<string | undefined> {
    return await this.secrets.get(key);
  }

  public async set(key: string, value: string): Promise<void> {
    await this.secrets.store(key, value);
  }

  public async delete(key: string): Promise<void> {
    await this.secrets.delete(key);
  }
}
