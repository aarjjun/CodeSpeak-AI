import type { AccessibilityProfileId } from '../../domain/accessibility/accessibility-profile';
import {
  DEFAULT_DYSLEXIA_SETTINGS,
  dyslexiaSettingPreset,
  type DyslexiaSettings,
} from './dyslexia/dyslexia-settings';

export type ProfileSettingPreset = Readonly<Record<string, unknown>>;

const LOW_VISION_PRESET: ProfileSettingPreset = {
  'window.zoomLevel': 1,
  'editor.fontSize': 18,
  'editor.lineHeight': 30,
  'editor.cursorWidth': 4,
  'editor.lineHighlight': 'all',
  'editor.minimap.enabled': false,
  'editor.renderWhitespace': 'selection',
  'workbench.reduceMotion': 'on',
};

const ADHD_PRESET: ProfileSettingPreset = {
  'editor.minimap.enabled': false,
  'editor.stickyScroll.enabled': false,
  'editor.codeLens': false,
  'editor.hover.enabled': false,
  'breadcrumbs.enabled': false,
  'workbench.reduceMotion': 'on',
};

export function profileSettingPreset(
  profileId: AccessibilityProfileId,
  dyslexiaSettings: DyslexiaSettings = DEFAULT_DYSLEXIA_SETTINGS,
): ProfileSettingPreset {
  switch (profileId) {
    case 'dyslexia':
      return dyslexiaSettingPreset(dyslexiaSettings);
    case 'low-vision':
      return LOW_VISION_PRESET;
    case 'adhd':
      return ADHD_PRESET;
    case 'blind':
    case 'custom':
      return {};
  }
}

export const MANAGED_PROFILE_SETTING_KEYS = [
  ...new Set(
    [dyslexiaSettingPreset(DEFAULT_DYSLEXIA_SETTINGS), LOW_VISION_PRESET, ADHD_PRESET].flatMap(
      (preset) => Object.keys(preset),
    ),
  ),
].sort();
