import { describe, expect, it } from 'vitest';
import { TypeScriptAstParser } from '../../../src/infrastructure/parsing/typescript/typescript-ast-parser';

describe('TypeScriptAstParser', () => {
  it('builds a normalized structure from TypeScript AST nodes', async () => {
    const parser = new TypeScriptAstParser();
    const result = await parser.parse({
      uri: 'file:///authentication.ts',
      languageId: 'typescript',
      version: 1,
      content: `
        import { database } from './database';

        class Authentication {
          login(email: string, password: string) {
            if (!email) {
              return;
            }
            const token = database.query(email, password);
            return token;
          }
        }

        function isReady(value?: boolean) {
          return value ?? false;
        }
      `,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.imports).toHaveLength(1);
      expect(result.value.classes[0]?.name).toBe('Authentication');
      const login = result.value.classes[0]?.methods[0];
      expect(login?.parameters.map((parameter) => parameter.name)).toEqual(['email', 'password']);
      expect(login?.controlFlow.conditionalCount).toBe(1);
      expect(login?.calls[0]?.name).toBe('database.query');
      expect(login?.returnDescription).toBe('May return a value or return without a value.');
      expect(result.value.functions[0]?.name).toBe('isReady');
      expect(result.value.parseErrors).toHaveLength(0);
    }
  });

  it('returns a typed unsupported-language error', async () => {
    const parser = new TypeScriptAstParser();
    const result = await parser.parse({
      uri: 'file:///example.py',
      languageId: 'python',
      version: 1,
      content: 'print("hello")',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('unsupported-language');
    }
  });
});
