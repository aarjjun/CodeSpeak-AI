import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { runTests } from '@vscode/test-electron';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const extensionDevelopmentPath = path.resolve(scriptDirectory, '..');
const extensionTestsPath = path.resolve(
  extensionDevelopmentPath,
  'dist-test',
  'integration',
  'index.js',
);
const testProfilePath = fs.mkdtempSync(path.join(os.tmpdir(), 'codespeak-vscode-test-'));
const userDataPath = path.join(testProfilePath, 'user-data');
const extensionsPath = path.join(testProfilePath, 'extensions');

try {
  await runTests({
    version: process.env.VSCODE_TEST_VERSION ?? '1.98.0',
    extensionDevelopmentPath,
    extensionTestsPath,
    launchArgs: [
      '--disable-extensions',
      '--disable-workspace-trust',
      '--user-data-dir',
      userDataPath,
      '--extensions-dir',
      extensionsPath,
    ],
  });
} catch (error) {
  console.error('VS Code Extension Host tests failed.', error);
  process.exitCode = 1;
} finally {
  fs.rmSync(testProfilePath, { recursive: true, force: true });
}
