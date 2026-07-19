import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import process from 'node:process';

const require = createRequire(import.meta.url);
const vitestExecutable = path.resolve(path.dirname(require.resolve('vitest')), 'vitest.mjs');
const child = spawn(process.execPath, [vitestExecutable, 'run', '--coverage'], {
  env: { ...process.env, VITEST_SKIP_INSTALL_CHECKS: 'true' },
  stdio: 'inherit',
  windowsHide: true,
});

child.once('error', (error) => {
  console.error('Coverage runner could not start.', error);
  process.exitCode = 1;
});
child.once('close', (code) => {
  process.exitCode = code ?? 1;
});
