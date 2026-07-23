import type { SecretStore } from '../../ports/persistence/persistence-ports';
import type { OperationResult } from '../../../domain/shared/operation-error';
import { SecretKeys } from '../../../config/secrets';

export class ManageApiKey {
  public constructor(
    private readonly secrets: SecretStore,
    private readonly secretKey: string = SecretKeys.geminiApiKey,
  ) {}

  public async save(value: string): Promise<OperationResult<void>> {
    const normalizedValue = value.trim();
    if (normalizedValue.length === 0) {
      return {
        ok: false,
        error: {
          code: 'configuration',
          message: 'The API key cannot be empty.',
          retryable: true,
          recoveryActions: [],
        },
      };
    }

    await this.secrets.set(this.secretKey, normalizedValue);
    return { ok: true, value: undefined };
  }

  public async clear(): Promise<void> {
    await this.secrets.delete(this.secretKey);
  }
}
