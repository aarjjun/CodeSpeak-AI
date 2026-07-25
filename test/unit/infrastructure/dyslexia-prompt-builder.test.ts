import { describe, expect, it } from 'vitest';
import {
  DYSLEXIA_EXPLANATION_RULES,
  dyslexiaTask,
} from '../../../src/infrastructure/ai/prompts/dyslexia-prompt-builder';

describe('Dyslexia prompt builder', () => {
  it('requires short plain language explanations in a stable order', () => {
    const prompt = dyslexiaTask('Explain the current line.');

    expect(prompt).toContain('Task: Explain the current line.');
    expect(prompt).toContain('Use short sentences.');
    expect(prompt).toContain('Explain one idea at a time.');
    expect(prompt).toContain('State the next action second.');
    expect(DYSLEXIA_EXPLANATION_RULES).toHaveLength(8);
  });
});
