import { describe, expect, it, vi } from 'vitest';
import { ManageApiKey } from '../../../src/application/use-cases/ai/manage-api-key';
import type { SecretStore } from '../../../src/application/ports/persistence/persistence-ports';
import { SecretKeys } from '../../../src/config/secrets';

function createSecretStore(): {
  readonly store: SecretStore;
  readonly set: ReturnType<typeof vi.fn>;
  readonly remove: ReturnType<typeof vi.fn>;
} {
  const set = vi.fn().mockResolvedValue(undefined);
  const remove = vi.fn().mockResolvedValue(undefined);
  return {
    set,
    remove,
    store: {
      get: () => Promise.resolve(undefined),
      set,
      delete: remove,
    },
  };
}

describe('ManageApiKey', () => {
  it('trims and stores a non-empty key', async () => {
    const { store, set } = createSecretStore();
    const useCase = new ManageApiKey(store);

    const result = await useCase.save('  example-key  ');

    expect(result.ok).toBe(true);
    expect(set).toHaveBeenCalledWith(SecretKeys.geminiApiKey, 'example-key');
  });

  it('rejects an empty key without writing secret storage', async () => {
    const { store, set } = createSecretStore();
    const useCase = new ManageApiKey(store);

    const result = await useCase.save('   ');

    expect(result.ok).toBe(false);
    expect(set).not.toHaveBeenCalled();
  });

  it('removes the Gemini key by its stable secret identifier', async () => {
    const { store, remove } = createSecretStore();
    const useCase = new ManageApiKey(store);

    await useCase.clear();

    expect(remove).toHaveBeenCalledWith(SecretKeys.geminiApiKey);
  });
});
