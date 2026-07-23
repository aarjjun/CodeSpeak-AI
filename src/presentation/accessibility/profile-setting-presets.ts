import type { AccessibilityProfileId } from '../../domain/accessibility/accessibility-profile';

export type ProfileSettingPreset = Readonly<Record<string, unknown>>;

const DYSLEXIA_PRESET: ProfileSettingPreset = {
  'editor.fontFamily': 'OpenDyslexic, Cascadia Code, Consolas, monospace',
  'editor.fontSize': 16,
  'editor.lineHeight': 28,
  'editor.letterSpacing': 1,
  'editor.wordWrap': 'on',
  'editor.bracketPairColorization.enabled': true,
  'editor.guides.bracketPairs': true,
  'workbench.reduceMotion': 'on',
};

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

const MOTOR_PRESET: ProfileSettingPreset = {
  'window.zoomLevel': 1,
  'window.commandCenter': true,
  'editor.cursorWidth': 4,
  'editor.lineHighlight': 'all',
  'editor.minimap.enabled': false,
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

export function profileSettingPreset(profileId: AccessibilityProfileId): ProfileSettingPreset {
  switch (profileId) {
    case 'dyslexia':
      return DYSLEXIA_PRESET;
    case 'low-vision':
      return LOW_VISION_PRESET;
    case 'motor':
      return MOTOR_PRESET;
    case 'adhd':
      return ADHD_PRESET;
    case 'blind':
    case 'custom':
      return {};
  }
}

export const MANAGED_PROFILE_SETTING_KEYS = [
  ...new Set(
    [DYSLEXIA_PRESET, LOW_VISION_PRESET, MOTOR_PRESET, ADHD_PRESET].flatMap((preset) =>
      Object.keys(preset),
    ),
  ),
].sort();
