import { describe, expect, it } from 'vitest';
import {
  codeExplanationParser,
  generatedCodeParser,
} from '../../../src/infrastructure/ai/validation/ai-output-parsers';

describe('AI output parsers', () => {
  it('accepts a complete structured code response', () => {
    const result = generatedCodeParser.parse({
      code: 'print("hello")',
      explanation: 'Prints a greeting.',
      languageId: 'python',
    });

    expect(result.ok).toBe(true);
  });

  it('rejects empty required fields before an AI response reaches a use case', () => {
    const result = generatedCodeParser.parse({
      code: '',
      explanation: 'Missing code.',
      languageId: 'python',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('invalid-response');
    }
  });

  it('limits explanation detail lists to the accessible response contract', () => {
    const result = codeExplanationParser.parse({
      summary: 'Summary',
      details: Array.from({ length: 13 }, (_, index) => `Detail ${index.toString()}`),
      considerations: [],
    });

    expect(result.ok).toBe(false);
  });
});
