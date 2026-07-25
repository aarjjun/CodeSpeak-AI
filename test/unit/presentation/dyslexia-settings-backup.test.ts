import { describe, expect, it } from 'vitest';
import {
  planProfileSettingTransition,
  type ProfileSettingsState,
} from '../../../src/presentation/accessibility/dyslexia/settings-backup';

const empty: ProfileSettingsState = { baseline: {}, applied: {} };

describe('Dyslexia settings backup', () => {
  it('records and applies a workspace setting when enabling the mode', () => {
    const transition = planProfileSettingTransition(
      empty,
      { 'editor.fontSize': { exists: true, value: 14 } },
      { 'editor.fontSize': 16 },
    );

    expect(transition.state.baseline['editor.fontSize']).toEqual({ exists: true, value: 14 });
    expect(transition.writes).toEqual([{ key: 'editor.fontSize', value: 16 }]);
  });

  it('restores the exact original workspace value when disabling the mode', () => {
    const transition = planProfileSettingTransition(
      {
        baseline: { 'editor.fontSize': { exists: true, value: 14 } },
        applied: { 'editor.fontSize': 16 },
      },
      { 'editor.fontSize': { exists: true, value: 16 } },
      {},
    );

    expect(transition.writes).toEqual([{ key: 'editor.fontSize', value: 14 }]);
  });

  it('removes the workspace override to reveal a user level value', () => {
    const transition = planProfileSettingTransition(
      {
        baseline: { 'editor.fontFamily': { exists: false } },
        applied: { 'editor.fontFamily': '"Lexend", Consolas, "Courier New", monospace' },
      },
      {
        'editor.fontFamily': {
          exists: true,
          value: '"Lexend", Consolas, "Courier New", monospace',
        },
      },
      {},
    );

    expect(transition.writes).toEqual([{ key: 'editor.fontFamily', value: undefined }]);
  });

  it('does not overwrite a setting changed manually while the mode is active', () => {
    const transition = planProfileSettingTransition(
      {
        baseline: { 'editor.fontSize': { exists: true, value: 14 } },
        applied: { 'editor.fontSize': 16 },
      },
      { 'editor.fontSize': { exists: true, value: 18 } },
      {},
    );

    expect(transition.writes).toEqual([]);
    expect(transition.state.baseline['editor.fontSize']).toEqual({ exists: true, value: 18 });
  });

  it('does not rewrite settings when the active preset has not changed', () => {
    const transition = planProfileSettingTransition(
      {
        baseline: { 'editor.fontSize': { exists: true, value: 14 } },
        applied: { 'editor.fontSize': 16 },
      },
      { 'editor.fontSize': { exists: true, value: 16 } },
      { 'editor.fontSize': 16 },
    );

    expect(transition.writes).toEqual([]);
    expect(transition.state.applied).toEqual({ 'editor.fontSize': 16 });
  });

  it('preserves a manual change while the same preset remains active', () => {
    const transition = planProfileSettingTransition(
      {
        baseline: { 'editor.fontSize': { exists: true, value: 14 } },
        applied: { 'editor.fontSize': 16 },
      },
      { 'editor.fontSize': { exists: true, value: 18 } },
      { 'editor.fontSize': 16 },
    );

    expect(transition.writes).toEqual([]);
    expect(transition.state.baseline['editor.fontSize']).toEqual({ exists: true, value: 18 });
    expect(transition.state.applied).toEqual({});
  });
});
