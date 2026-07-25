import * as vscode from 'vscode';
import type { UserInterfaceGateway } from '../../../application/ports/platform/user-interface-gateway';
import { readDyslexiaSettings } from './dyslexia-settings';

export class DyslexiaConfigurationController {
  public constructor(private readonly userInterface: UserInterfaceGateway) {}

  public async configureFont(): Promise<void> {
    const selected = await this.userInterface.choose('Configure Dyslexia font', [
      {
        id: 'OpenDyslexic',
        label: 'OpenDyslexic',
        description: 'Requires a separate operating system font installation.',
      },
      {
        id: 'Atkinson Hyperlegible',
        label: 'Atkinson Hyperlegible',
        description: 'Requires a separate operating system font installation.',
      },
      {
        id: 'Lexend',
        label: 'Lexend',
        description: 'Requires a separate operating system font installation.',
      },
      {
        id: 'current',
        label: 'Use current editor font',
        description: 'Keep the effective VS Code editor font as the preferred font.',
      },
      {
        id: 'custom',
        label: 'Enter a custom font name',
        description: 'Use a font installed on this computer.',
      },
    ]);
    if (selected === undefined) return;
    let font = selected;
    if (selected === 'current') {
      font =
        vscode.workspace
          .getConfiguration('editor')
          .get<string>('fontFamily', 'Consolas')
          .split(',')[0]
          ?.trim()
          .replace(/^['"]|['"]$/gu, '') ?? 'Consolas';
    } else if (selected === 'custom') {
      const custom = await this.userInterface.requestText('Enter an installed font family', {
        placeHolder: 'For example: Cascadia Code',
      });
      if (custom === undefined || custom.trim().length === 0) return;
      font = custom.trim();
    }
    await this.update('fontFamily', font);
    await this.userInterface.showInformation(
      `Dyslexia font preference saved as ${font}. CodeSpeak will use fallback fonts if it is unavailable.`,
    );
  }

  public async showSetupInstructions(): Promise<void> {
    const document = await vscode.workspace.openTextDocument({
      language: 'markdown',
      content: [
        '# CodeSpeak Dyslexia Mode setup',
        '',
        '1. Install your preferred font through your operating system.',
        '2. Restart VS Code if the installed font is not available immediately.',
        '3. Run CodeSpeak AI: Configure Dyslexia Font and select the font.',
        '4. Run CodeSpeak AI: Toggle Dyslexia Mode.',
        '5. Run CodeSpeak AI: Configure Dyslexia Mode to adjust spacing and visual options.',
        '',
        'CodeSpeak cannot reliably detect installed fonts through the VS Code API.',
        'The selected font always includes Consolas, Courier New, and monospace fallbacks.',
        'No font is guaranteed to help every reader. Choose the presentation that works for you.',
      ].join('\n'),
    });
    await vscode.window.showTextDocument(document, {
      preview: true,
      preserveFocus: false,
      viewColumn: vscode.ViewColumn.Beside,
    });
  }

  public async configure(): Promise<void> {
    const settings = readDyslexiaSettings(vscode.workspace.getConfiguration('codespeak.dyslexia'));
    const selected = await this.userInterface.choose('Configure Dyslexia Mode', [
      { id: 'font', label: 'Font family', description: settings.fontFamily },
      { id: 'fontSize', label: 'Font size', description: String(settings.fontSize) },
      { id: 'lineHeight', label: 'Line height', description: String(settings.lineHeight) },
      {
        id: 'letterSpacing',
        label: 'Letter spacing',
        description: String(settings.letterSpacing),
      },
      { id: 'cursorWidth', label: 'Cursor width', description: String(settings.cursorWidth) },
      toggleChoice('hideMinimap', 'Hide minimap', settings.hideMinimap),
      toggleChoice('hideBreadcrumbs', 'Hide breadcrumbs', settings.hideBreadcrumbs),
      toggleChoice('disableCodeLens', 'Disable CodeLens', settings.disableCodeLens),
      toggleChoice('disableStickyScroll', 'Disable sticky scroll', settings.disableStickyScroll),
      toggleChoice('hideIndentGuides', 'Hide indentation guides', settings.hideIndentGuides),
      toggleChoice('highlightActiveLine', 'Highlight active line', settings.highlightActiveLine),
      toggleChoice(
        'highlightCurrentBlock',
        'Highlight current block',
        settings.highlightCurrentBlock,
      ),
      toggleChoice('enableBracketColors', 'Enable bracket colors', settings.enableBracketColors),
      toggleChoice('enableBracketGuides', 'Enable bracket guides', settings.enableBracketGuides),
      toggleChoice(
        'enableSimplifiedExplanations',
        'Enable simple explanations',
        settings.enableSimplifiedExplanations,
      ),
      toggleChoice('dimInactiveCode', 'Dim inactive code', settings.dimInactiveCode),
    ]);
    if (selected === undefined) return;
    if (selected === 'font') return this.configureFont();
    if (isNumericSetting(selected)) {
      await this.configureNumber(selected, settings[selected]);
      return;
    }
    if (!isBooleanSetting(selected)) return;
    const current = settings[selected];
    await this.update(selected, !current);
    await this.userInterface.showInformation(
      `${displaySettingName(selected)} ${current ? 'disabled' : 'enabled'}.`,
    );
  }

  private async configureNumber(
    key: 'fontSize' | 'lineHeight' | 'letterSpacing' | 'cursorWidth',
    current: number,
  ): Promise<void> {
    const value = await this.userInterface.requestText(`Set Dyslexia ${displaySettingName(key)}`, {
      value: String(current),
    });
    if (value === undefined) return;
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      await this.userInterface.showWarning('Enter a valid number.');
      return;
    }
    const [minimum, maximum] = numericBounds(key);
    if (parsed < minimum || parsed > maximum) {
      await this.userInterface.showWarning(
        `Enter a value from ${String(minimum)} to ${String(maximum)}.`,
      );
      return;
    }
    await this.update(key, parsed);
    await this.userInterface.showInformation(`${displaySettingName(key)} saved.`);
  }

  private async update(key: string, value: unknown): Promise<void> {
    await vscode.workspace
      .getConfiguration('codespeak.dyslexia')
      .update(key, value, vscode.ConfigurationTarget.Global);
  }
}

function toggleChoice(id: string, label: string, enabled: boolean) {
  return { id, label, description: enabled ? 'Enabled' : 'Disabled' };
}

function isNumericSetting(
  value: string,
): value is 'fontSize' | 'lineHeight' | 'letterSpacing' | 'cursorWidth' {
  return ['fontSize', 'lineHeight', 'letterSpacing', 'cursorWidth'].includes(value);
}

function isBooleanSetting(
  value: string,
): value is
  | 'hideMinimap'
  | 'hideBreadcrumbs'
  | 'disableCodeLens'
  | 'disableStickyScroll'
  | 'hideIndentGuides'
  | 'highlightActiveLine'
  | 'highlightCurrentBlock'
  | 'enableBracketColors'
  | 'enableBracketGuides'
  | 'enableSimplifiedExplanations'
  | 'dimInactiveCode' {
  return [
    'hideMinimap',
    'hideBreadcrumbs',
    'disableCodeLens',
    'disableStickyScroll',
    'hideIndentGuides',
    'highlightActiveLine',
    'highlightCurrentBlock',
    'enableBracketColors',
    'enableBracketGuides',
    'enableSimplifiedExplanations',
    'dimInactiveCode',
  ].includes(value);
}

function displaySettingName(value: string): string {
  return value.replace(/([A-Z])/gu, ' $1').toLocaleLowerCase();
}

function numericBounds(
  key: 'fontSize' | 'lineHeight' | 'letterSpacing' | 'cursorWidth',
): readonly [number, number] {
  const bounds = {
    fontSize: [10, 40],
    lineHeight: [0, 60],
    letterSpacing: [0, 5],
    cursorWidth: [1, 10],
  } as const;
  return bounds[key];
}
