export interface StoredSetting {
  readonly exists: boolean;
  readonly value?: unknown;
}

export interface ProfileSettingsState {
  readonly baseline: Readonly<Record<string, StoredSetting>>;
  readonly applied: Readonly<Record<string, unknown>>;
}

export interface SettingWrite {
  readonly key: string;
  readonly value: unknown;
}

export function planProfileSettingTransition(
  stored: ProfileSettingsState,
  current: Readonly<Record<string, StoredSetting>>,
  nextPreset: Readonly<Record<string, unknown>>,
): { readonly state: ProfileSettingsState; readonly writes: readonly SettingWrite[] } {
  const baseline: Record<string, StoredSetting> = { ...stored.baseline };
  const applied: Record<string, unknown> = {};
  const writes: SettingWrite[] = [];
  const keys = new Set([...Object.keys(stored.applied), ...Object.keys(nextPreset)]);

  for (const key of keys) {
    const wasApplied = Object.prototype.hasOwnProperty.call(stored.applied, key);
    const willApply = Object.prototype.hasOwnProperty.call(nextPreset, key);
    const currentSetting = current[key] ?? { exists: false };
    if (!wasApplied) {
      baseline[key] = currentSetting;
      writes.push({ key, value: nextPreset[key] });
      applied[key] = nextPreset[key];
      continue;
    }

    const previousAppliedValue = stored.applied[key];
    const stillMatches =
      currentSetting.exists && settingsEqual(currentSetting.value, previousAppliedValue);
    if (!stillMatches) {
      baseline[key] = currentSetting;
      continue;
    }

    if (!willApply) {
      const original = baseline[key] ?? { exists: false };
      writes.push({ key, value: original.exists ? original.value : undefined });
      continue;
    }

    const nextValue = nextPreset[key];
    if (!settingsEqual(previousAppliedValue, nextValue)) {
      writes.push({ key, value: nextValue });
    }
    applied[key] = nextValue;
  }

  return {
    state: { baseline, applied },
    writes,
  };
}

function settingsEqual(first: unknown, second: unknown): boolean {
  return JSON.stringify(first) === JSON.stringify(second);
}
