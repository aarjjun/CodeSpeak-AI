import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CommandIds } from '../../src/presentation/commands/command-ids';
import { CODE_SPEAK_COMMANDS } from '../../src/presentation/commands/command-registry';

interface CommandContribution {
  readonly command: string;
  readonly title: string;
  readonly category?: string;
}

interface KeybindingContribution {
  readonly command: string;
  readonly key: string;
  readonly mac?: string;
  readonly when?: string;
}

interface ConfigurationContribution {
  readonly description?: string;
  readonly enum?: readonly string[];
  readonly enumDescriptions?: readonly string[];
}

interface ExtensionManifest {
  readonly contributes: {
    readonly commands: readonly CommandContribution[];
    readonly keybindings: readonly KeybindingContribution[];
    readonly configuration: {
      readonly properties: Readonly<Record<string, ConfigurationContribution>>;
    };
  };
}

const manifest = JSON.parse(
  readFileSync(resolve(process.cwd(), 'package.json'), 'utf8'),
) as ExtensionManifest;

describe('accessible extension manifest', () => {
  it('contributes every registered CodeSpeak command to the keyboard-accessible Command Palette', () => {
    const contributed = new Set(manifest.contributes.commands.map((item) => item.command));
    expect([...Object.values(CommandIds)].sort()).toEqual([...contributed].sort());
  });

  it('gives every command a human-readable title and category', () => {
    for (const command of manifest.contributes.commands) {
      expect(command.title.trim(), command.command).not.toBe('');
      expect(command.category, command.command).toBe('CodeSpeak AI');
    }
  });

  it('keeps the voice registry synchronized with every Command Palette action', () => {
    const voiceCommands = new Set(CODE_SPEAK_COMMANDS.map((item) => item.id));
    expect([...Object.values(CommandIds)].sort()).toEqual([...voiceCommands].sort());
  });

  it('provides keyboard start and stop paths for voice input on Windows, Linux, and macOS', () => {
    const voiceBindings = manifest.contributes.keybindings.filter(
      (binding) => binding.command === CommandIds.voiceToggle,
    );
    expect(voiceBindings).toHaveLength(2);
    expect(
      voiceBindings.every((binding) => binding.key.length > 0 && binding.mac !== undefined),
    ).toBe(true);
    expect(
      voiceBindings.some((binding) => binding.when?.includes('!codespeak.voiceListening')),
    ).toBe(true);
    expect(
      voiceBindings.some((binding) => binding.when?.includes('codespeak.voiceListening')),
    ).toBe(true);
  });

  it('documents every user-facing setting and keeps enum descriptions aligned', () => {
    for (const [setting, contribution] of Object.entries(
      manifest.contributes.configuration.properties,
    )) {
      expect(contribution.description?.trim().length, setting).toBeGreaterThan(0);
      if (contribution.enum !== undefined) {
        expect(contribution.enumDescriptions, setting).toHaveLength(contribution.enum.length);
      }
    }
  });
});
