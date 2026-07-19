import { describe, expect, it, vi } from 'vitest';
import { ParserRegistry } from '../../../src/application/services/parser-registry';
import type { CodeParser } from '../../../src/application/ports/parsing/code-parser';
import type { CodeStructure } from '../../../src/domain/code-intelligence/code-structure';
import type { WorkspaceDocument } from '../../../src/domain/workspace/workspace-contracts';

const document: WorkspaceDocument = {
  uri: 'file:///example.ts',
  languageId: 'typescript',
  version: 1,
  content: 'const answer = 42;',
};

const structure: CodeStructure = {
  uri: document.uri,
  languageId: document.languageId,
  documentVersion: document.version,
  imports: [],
  classes: [],
  functions: [],
  parseErrors: [],
};

function createParser(languageId: string): {
  readonly parser: CodeParser;
  readonly parse: ReturnType<typeof vi.fn>;
  readonly invalidate: ReturnType<typeof vi.fn>;
} {
  const parse = vi.fn().mockResolvedValue({ ok: true, value: structure });
  const invalidate = vi.fn();
  return {
    parse,
    invalidate,
    parser: {
      supportedLanguageIds: [languageId],
      supports: (candidate) => candidate === languageId,
      parse,
      invalidate,
    },
  };
}

describe('ParserRegistry', () => {
  it('delegates to the parser supporting the document language', async () => {
    const { parser, parse } = createParser('typescript');
    const registry = new ParserRegistry([parser]);

    const result = await registry.parse(document);

    expect(result).toEqual({ ok: true, value: structure });
    expect(parse).toHaveBeenCalledWith(document, undefined);
  });

  it('returns a typed error for an unsupported language', async () => {
    const registry = new ParserRegistry([]);

    const result = await registry.parse(document);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('unsupported-language');
    }
  });

  it('does not invoke a parser after cancellation', async () => {
    const { parser, parse } = createParser('typescript');
    const registry = new ParserRegistry([parser]);
    const controller = new AbortController();
    controller.abort();

    const result = await registry.parse(document, controller.signal);

    expect(result.ok).toBe(false);
    expect(parse).not.toHaveBeenCalled();
  });
});
