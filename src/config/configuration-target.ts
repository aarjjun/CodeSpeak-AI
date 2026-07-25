export interface ConfigurationScopeInspection {
  readonly workspaceFolderValue?: unknown;
  readonly workspaceValue?: unknown;
}

export type ConfigurationScope = 'workspace' | 'global';

export function configurationScopeForProfile(
  inspection: ConfigurationScopeInspection | undefined,
): ConfigurationScope {
  if (inspection?.workspaceFolderValue !== undefined) return 'workspace';
  if (inspection?.workspaceValue !== undefined) return 'workspace';
  return 'global';
}
