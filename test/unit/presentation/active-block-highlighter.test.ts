import { describe, expect, it } from 'vitest';
import { findIndentationBlock } from '../../../src/presentation/accessibility/dyslexia/active-block-highlighter';

describe('Dyslexia active block fallback', () => {
  it('finds the surrounding indentation block', () => {
    const lines = [
      'function createUser() {',
      '  if (ready) {',
      '    return user;',
      '  }',
      '}',
      'next();',
    ];

    expect(findIndentationBlock(lines, 2)).toEqual({ startLine: 1, endLine: 2 });
  });

  it('handles empty documents and out of range cursor positions safely', () => {
    expect(findIndentationBlock([], 20)).toEqual({ startLine: 0, endLine: 0 });
    expect(findIndentationBlock(['const value = 1;'], 20)).toEqual({
      startLine: 0,
      endLine: 0,
    });
  });
});
