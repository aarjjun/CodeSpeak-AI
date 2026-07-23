import { describe, expect, it } from 'vitest';
import { LocalDemoAiProvider } from '../../../src/infrastructure/ai/demo/local-demo-ai-provider';
import { learningAssistanceParser } from '../../../src/infrastructure/ai/validation/ai-output-parsers';

describe('LocalDemoAiProvider', () => {
  it('returns a validated recursion lesson without an external request', async () => {
    const provider = new LocalDemoAiProvider();

    const result = await provider.generate(
      {
        capability: 'learning-assistance',
        promptId: 'learning.assist',
        input: { question: 'What is recursion?' },
        context: [],
      },
      learningAssistanceParser,
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.model).toBe('codespeak-local-demo');
      expect(result.value.output.explanation).toContain('base case');
    }
  });
});
