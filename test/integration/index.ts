import assert from 'node:assert/strict';
import * as vscode from 'vscode';

const EXTENSION_ID = 'codespeak-ai.codespeak-ai';

const EXPECTED_COMMANDS = [
  'codespeak.accessibility.showControls',
  'codespeak.checkAccessibility',
  'codespeak.clearAccessibilityFindings',
  'codespeak.clearApiKey',
  'codespeak.clearOpenAiApiKey',
  'codespeak.explainDiagnostic',
  'codespeak.explainSelection',
  'codespeak.generateCode',
  'codespeak.generateDocumentation',
  'codespeak.focus.toggleView',
  'codespeak.summarizeFile',
  'codespeak.summarizeFolder',
  'codespeak.summarizeWorkspace',
  'codespeak.goToLine',
  'codespeak.listDiagnostics',
  'codespeak.openFile',
  'codespeak.readCodeStructure',
  'codespeak.redo',
  'codespeak.selectAccessibilityProfile',
  'codespeak.setApiKey',
  'codespeak.setOpenAiApiKey',
  'codespeak.speech.speakSelection',
  'codespeak.speech.stop',
  'codespeak.undo',
  'codespeak.voice.startContinuous',
  'codespeak.voice.cancelCurrent',
  'codespeak.voice.stopContinuous',
  'codespeak.voice.simulate',
  'codespeak.voice.toggle',
] as const;

interface IntegrationCase {
  readonly name: string;
  readonly execute: () => void | Promise<void>;
}

const cases: readonly IntegrationCase[] = [
  {
    name: 'activates the extension',
    execute: async () => {
      const extension = vscode.extensions.getExtension(EXTENSION_ID);
      assert.ok(extension, `Extension ${EXTENSION_ID} was not loaded.`);
      await extension.activate();
      assert.equal(extension.isActive, true);
    },
  },
  {
    name: 'registers every public command',
    execute: async () => {
      const registered = new Set(await vscode.commands.getCommands(true));
      for (const command of EXPECTED_COMMANDS) {
        assert.ok(registered.has(command), `Command ${command} was not registered.`);
      }
    },
  },
  {
    name: 'publishes and clears accessibility diagnostics through VS Code',
    execute: async () => {
      const document = await vscode.workspace.openTextDocument({
        language: 'typescriptreact',
        content: 'export const View = () => <img src="avatar.png" />;',
      });
      await vscode.window.showTextDocument(document);
      await vscode.commands.executeCommand('codespeak.checkAccessibility');

      const findings = vscode.languages
        .getDiagnostics(document.uri)
        .filter((diagnostic) => diagnostic.source === 'CodeSpeak Accessibility');
      assert.ok(findings.length > 0, 'Expected a CodeSpeak accessibility diagnostic.');
      assert.ok(
        findings.some(
          (diagnostic) =>
            typeof diagnostic.code === 'object' && diagnostic.code.value === 'jsx-img-alt',
        ),
      );

      await vscode.commands.executeCommand('codespeak.clearAccessibilityFindings');
      assert.equal(
        vscode.languages
          .getDiagnostics(document.uri)
          .some((diagnostic) => diagnostic.source === 'CodeSpeak Accessibility'),
        false,
      );
      await vscode.commands.executeCommand('workbench.action.closeAllEditors');
    },
  },
  {
    name: 'loads safe configuration defaults',
    execute: () => {
      const configuration = vscode.workspace.getConfiguration('codespeak');
      assert.equal(configuration.get('accessibilityProfile'), 'custom');
      assert.equal(configuration.get('autoExplainErrors'), false);
      assert.equal(configuration.get('voice.rate'), 1);
      assert.equal(configuration.get('openaiModel'), 'gpt-5.6-sol');
      assert.equal(configuration.get('focus.minutes'), 5);
      assert.equal(configuration.get('focus.breakMinutes'), 5);
      assert.equal(configuration.get('dyslexia.enabled'), false);
      assert.equal(configuration.get('dyslexia.fontFamily'), 'OpenDyslexic');
      assert.equal(configuration.get('dyslexia.fontSize'), 16);
      assert.equal(configuration.get('dyslexia.lineHeight'), 26);
      assert.equal(configuration.get('dyslexia.letterSpacing'), 0.5);
      assert.equal(configuration.get('dyslexia.highlightCurrentBlock'), true);
      assert.equal(configuration.get('dyslexia.dimInactiveCode'), false);
    },
  },
];

export async function run(): Promise<void> {
  const failures: Error[] = [];
  for (const integrationCase of cases) {
    try {
      await integrationCase.execute();
      console.log(`PASS: ${integrationCase.name}`);
    } catch (error: unknown) {
      const failure =
        error instanceof Error
          ? new Error(`${integrationCase.name}: ${error.message}`, { cause: error })
          : new Error(`${integrationCase.name}: ${String(error)}`);
      console.error(failure);
      failures.push(failure);
    }
  }
  if (failures.length > 0) {
    throw new AggregateError(failures, `${String(failures.length)} integration tests failed.`);
  }
}
