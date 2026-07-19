import { readFile } from 'node:fs/promises';
import process from 'node:process';

const manifest = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
const tag = process.env.GITHUB_REF_TYPE === 'tag' ? process.env.GITHUB_REF_NAME : undefined;

if (tag !== undefined && tag !== `v${manifest.version}`) {
  console.error(`Release tag ${tag} does not match package version v${manifest.version}.`);
  process.exitCode = 1;
} else {
  console.log(`Release version verified: ${manifest.version}`);
}
