import { describe, expect, it } from 'vitest';
import { describeAmbiguousCharacters } from '../../../src/presentation/accessibility/dyslexia/ambiguous-character-analyzer';

describe('Ambiguous character reader', () => {
  it('names commonly confused characters with their line numbers', () => {
    expect(describeAmbiguousCharacters('login = O1;\nvalue', 18)).toEqual([
      'Line 18 contains 1 lowercase L, 1 lowercase o, 1 uppercase O, 1 number one, 1 semicolon.',
      'Line 19 contains 1 lowercase L.',
    ]);
  });

  it('returns no messages when the text has no configured ambiguous characters', () => {
    expect(describeAmbiguousCharacters('xyz', 1)).toEqual([]);
  });
});
