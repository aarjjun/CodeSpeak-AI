import { describe, expect, it } from 'vitest';
import { configurationScopeForProfile } from '../../../src/config/configuration-target';

describe('accessibility profile configuration scope', () => {
  it('updates an existing workspace value instead of being hidden by it', () => {
    expect(configurationScopeForProfile({ workspaceValue: 'blind' })).toBe('workspace');
  });

  it('maps a folder override to supported workspace scope', () => {
    expect(
      configurationScopeForProfile({
        workspaceValue: 'custom',
        workspaceFolderValue: 'blind',
      }),
    ).toBe('workspace');
  });

  it('uses the global scope when the workspace has no override', () => {
    expect(configurationScopeForProfile(undefined)).toBe('global');
    expect(configurationScopeForProfile({})).toBe('global');
  });
});
