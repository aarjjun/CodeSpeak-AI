import { describe, expect, it } from 'vitest';
import {
  MANAGED_PROFILE_SETTING_KEYS,
  profileSettingPreset,
} from '../../../src/presentation/accessibility/profile-setting-presets';

describe('profileSettingPreset', () => {
  it('adds readable typography and bracket guidance for dyslexia mode', () => {
    const preset = profileSettingPreset('dyslexia');
    expect(preset['editor.fontFamily']).toContain('OpenDyslexic');
    expect(preset['editor.letterSpacing']).toBe(0.5);
    expect(preset['editor.bracketPairColorization.enabled']).toBe(true);
  });

  it('adds magnification and a visible cursor for low vision mode', () => {
    const preset = profileSettingPreset('low-vision');
    expect(preset['window.zoomLevel']).toBe(1);
    expect(preset['editor.fontSize']).toBe(18);
    expect(preset['editor.cursorWidth']).toBe(4);
  });

  it('removes common editor distractions for ADHD mode', () => {
    const preset = profileSettingPreset('adhd');
    expect(preset['editor.minimap.enabled']).toBe(false);
    expect(preset['editor.codeLens']).toBe(false);
    expect(preset['editor.hover.enabled']).toBe(false);
  });

  it('does not override visual settings for blind or custom modes', () => {
    expect(profileSettingPreset('blind')).toEqual({});
    expect(profileSettingPreset('custom')).toEqual({});
  });

  it('lists every setting managed by a profile exactly once', () => {
    const allKeys = ['dyslexia', 'low-vision', 'adhd'].flatMap((profile) =>
      Object.keys(profileSettingPreset(profile as 'dyslexia' | 'low-vision' | 'adhd')),
    );
    expect(MANAGED_PROFILE_SETTING_KEYS).toEqual([...new Set(allKeys)].sort());
  });
});
