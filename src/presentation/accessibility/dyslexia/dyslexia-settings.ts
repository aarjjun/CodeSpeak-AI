export interface DyslexiaSettings {
  readonly fontFamily: string;
  readonly fontSize: number;
  readonly lineHeight: number;
  readonly letterSpacing: number;
  readonly cursorWidth: number;
  readonly hideMinimap: boolean;
  readonly hideBreadcrumbs: boolean;
  readonly disableCodeLens: boolean;
  readonly disableStickyScroll: boolean;
  readonly hideIndentGuides: boolean;
  readonly highlightActiveLine: boolean;
  readonly highlightCurrentBlock: boolean;
  readonly enableBracketColors: boolean;
  readonly enableBracketGuides: boolean;
  readonly enableSimplifiedExplanations: boolean;
  readonly dimInactiveCode: boolean;
}

export const DEFAULT_DYSLEXIA_SETTINGS: DyslexiaSettings = {
  fontFamily: 'OpenDyslexic',
  fontSize: 16,
  lineHeight: 26,
  letterSpacing: 0.5,
  cursorWidth: 2,
  hideMinimap: true,
  hideBreadcrumbs: true,
  disableCodeLens: false,
  disableStickyScroll: true,
  hideIndentGuides: false,
  highlightActiveLine: true,
  highlightCurrentBlock: true,
  enableBracketColors: true,
  enableBracketGuides: true,
  enableSimplifiedExplanations: true,
  dimInactiveCode: false,
};

export interface DyslexiaSettingReader {
  get<T>(key: string, fallback: T): T;
}

export function readDyslexiaSettings(reader: DyslexiaSettingReader): DyslexiaSettings {
  return {
    fontFamily: normalizedFont(reader.get('fontFamily', DEFAULT_DYSLEXIA_SETTINGS.fontFamily)),
    fontSize: bounded(reader.get('fontSize', DEFAULT_DYSLEXIA_SETTINGS.fontSize), 10, 40, 16),
    lineHeight: bounded(reader.get('lineHeight', DEFAULT_DYSLEXIA_SETTINGS.lineHeight), 0, 60, 26),
    letterSpacing: bounded(
      reader.get('letterSpacing', DEFAULT_DYSLEXIA_SETTINGS.letterSpacing),
      0,
      5,
      0.5,
    ),
    cursorWidth: bounded(
      reader.get('cursorWidth', DEFAULT_DYSLEXIA_SETTINGS.cursorWidth),
      1,
      10,
      2,
    ),
    hideMinimap: reader.get('hideMinimap', true),
    hideBreadcrumbs: reader.get('hideBreadcrumbs', true),
    disableCodeLens: reader.get('disableCodeLens', false),
    disableStickyScroll: reader.get('disableStickyScroll', true),
    hideIndentGuides: reader.get('hideIndentGuides', false),
    highlightActiveLine: reader.get('highlightActiveLine', true),
    highlightCurrentBlock: reader.get('highlightCurrentBlock', true),
    enableBracketColors: reader.get('enableBracketColors', true),
    enableBracketGuides: reader.get('enableBracketGuides', true),
    enableSimplifiedExplanations: reader.get('enableSimplifiedExplanations', true),
    dimInactiveCode: reader.get('dimInactiveCode', false),
  };
}

export function dyslexiaFontFamily(value: string): string {
  const preferred = normalizedFont(value);
  const escaped = preferred.replaceAll('"', String.raw`\"`);
  return `"${escaped}", Consolas, "Courier New", monospace`;
}

export function dyslexiaSettingPreset(
  settings: DyslexiaSettings,
): Readonly<Record<string, unknown>> {
  return {
    'editor.fontFamily': dyslexiaFontFamily(settings.fontFamily),
    'editor.fontSize': settings.fontSize,
    'editor.lineHeight': settings.lineHeight,
    'editor.letterSpacing': settings.letterSpacing,
    'editor.cursorWidth': settings.cursorWidth,
    'editor.wordWrap': 'on',
    'editor.renderWhitespace': 'none',
    'editor.minimap.enabled': !settings.hideMinimap,
    'editor.renderLineHighlight': settings.highlightActiveLine ? 'all' : 'none',
    'editor.bracketPairColorization.enabled': settings.enableBracketColors,
    'editor.guides.bracketPairs': settings.enableBracketGuides,
    'editor.guides.indentation': !settings.hideIndentGuides,
    'editor.codeLens': !settings.disableCodeLens,
    'breadcrumbs.enabled': !settings.hideBreadcrumbs,
    'editor.stickyScroll.enabled': !settings.disableStickyScroll,
    'workbench.reduceMotion': 'on',
  };
}

function normalizedFont(value: string): string {
  const trimmed = value.trim();
  return trimmed.length === 0 ? DEFAULT_DYSLEXIA_SETTINGS.fontFamily : trimmed.slice(0, 120);
}

function bounded(value: number, minimum: number, maximum: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(maximum, Math.max(minimum, value));
}
