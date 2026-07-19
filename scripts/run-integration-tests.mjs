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

try {
  await runTests({
    version: process.env.VSCODE_TEST_VERSION ?? '1.98.0',
    extensionDevelopmentPath,
    extensionTestsPath,
    launchArgs: ['--disable-extensions', '--disable-workspace-trust'],
  });
} catch (error) {
  console.error('VS Code Extension Host tests failed.', error);
  process.exitCode = 1;
}
