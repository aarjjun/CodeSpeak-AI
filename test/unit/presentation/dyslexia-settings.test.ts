import { describe, expect, it } from 'vitest';
import {
  DEFAULT_DYSLEXIA_SETTINGS,
  dyslexiaFontFamily,
  dyslexiaSettingPreset,
  readDyslexiaSettings,
} from '../../../src/presentation/accessibility/dyslexia/dyslexia-settings';

describe('Dyslexia settings', () => {
  it('applies readable defaults and safe font fallbacks', () => {
    const preset = dyslexiaSettingPreset(DEFAULT_DYSLEXIA_SETTINGS);

    expect(preset['editor.fontFamily']).toBe('"OpenDyslexic", Consolas, "Courier New", monospace');
    expect(preset['editor.fontSize']).toBe(16);
    expect(preset['editor.lineHeight']).toBe(26);
    expect(preset['editor.letterSpacing']).toBe(0.5);
    expect(preset['editor.minimap.enabled']).toBe(false);
    expect(preset['editor.renderLineHighlight']).toBe('all');
  });

  it('supports custom font names and escapes quotes', () => {
    expect(dyslexiaFontFamily('Reader "Wide"')).toBe(
      '"Reader \\"Wide\\"", Consolas, "Courier New", monospace',
    );
  });

  it('honors individual visual simplification choices', () => {
    const preset = dyslexiaSettingPreset({
      ...DEFAULT_DYSLEXIA_SETTINGS,
      hideMinimap: false,
      hideBreadcrumbs: false,
      disableCodeLens: true,
      disableStickyScroll: false,
      hideIndentGuides: true,
      enableBracketColors: false,
      enableBracketGuides: false,
    });

    expect(preset['editor.minimap.enabled']).toBe(true);
    expect(preset['breadcrumbs.enabled']).toBe(true);
    expect(preset['editor.codeLens']).toBe(false);
    expect(preset['editor.stickyScroll.enabled']).toBe(true);
    expect(preset['editor.guides.indentation']).toBe(false);
    expect(preset['editor.bracketPairColorization.enabled']).toBe(false);
    expect(preset['editor.guides.bracketPairs']).toBe(false);
  });

  it('bounds invalid numeric settings and replaces an empty font', () => {
    const values: Readonly<Record<string, unknown>> = {
      fontFamily: '   ',
      fontSize: 200,
      lineHeight: Number.NaN,
      letterSpacing: -4,
      cursorWidth: 0,
    };
    const settings = readDyslexiaSettings({
      get: <T>(key: string, fallback: T) => (values[key] ?? fallback) as T,
    });

    expect(settings.fontFamily).toBe('OpenDyslexic');
    expect(settings.fontSize).toBe(40);
    expect(settings.lineHeight).toBe(26);
    expect(settings.letterSpacing).toBe(0);
    expect(settings.cursorWidth).toBe(1);
  });
});
