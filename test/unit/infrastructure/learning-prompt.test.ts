import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('learning assistance prompt', () => {
  it('includes the spoken question and language context', () => {
    const prompt = fs.readFileSync(
      path.resolve('resources', 'prompts', 'learning-assistance.prompt.md'),
      'utf8',
    );

    expect(prompt).toContain('Question: {{question}}');
    expect(prompt).toContain('Language context: {{languageId}}');
  });
});
