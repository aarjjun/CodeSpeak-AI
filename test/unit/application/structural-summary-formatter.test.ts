import { describe, expect, it } from 'vitest';
import { StructuralSummaryFormatter } from '../../../src/application/services/structural-summary-formatter';
import { AccessibilityProfileCatalog } from '../../../src/domain/accessibility/accessibility-profile-catalog';
import type {
  CodeStructure,
  FunctionStructure,
} from '../../../src/domain/code-intelligence/code-structure';

const currentFunction: FunctionStructure = {
  name: 'login',
  range: { start: { line: 5, character: 0 }, end: { line: 20, character: 1 } },
  parameters: [
    { name: 'email', type: 'string', optional: false },
    { name: 'password', type: 'string', optional: false },
  ],
  controlFlow: { conditionalCount: 2, loopCount: 0, exceptionHandlerCount: 1 },
  calls: [
    {
      name: 'database.findUser',
      range: { start: { line: 8, character: 2 }, end: { line: 8, character: 21 } },
      classification: 'database',
      classificationIsInferred: true,
    },
  ],
  returnDescription: 'Returns a JWT token.',
  returnDescriptionIsInferred: true,
};

const structure: CodeStructure = {
  uri: 'file:///workspace/Authentication.ts',
  languageId: 'typescript',
  documentVersion: 1,
  imports: [
    {
      moduleName: 'jwt',
      importedNames: ['sign'],
      range: { start: { line: 0, character: 0 }, end: { line: 0, character: 24 } },
    },
  ],
  classes: [],
  functions: [currentFunction],
  parseErrors: [],
};

describe('StructuralSummaryFormatter', () => {
  it('describes the function containing the cursor in navigable language', () => {
    const summary = new StructuralSummaryFormatter().format(
      structure,
      new AccessibilityProfileCatalog().get('blind'),
      { line: 10, character: 0 },
    );

    expect(summary.title).toBe('Structure of Authentication.ts');
    expect(summary.lines).toContain('Current function: login.');
    expect(summary.lines).toContain('Parameters: email, password.');
    expect(summary.lines).toContain('Returns a JWT token.');
  });

  it('keeps brief profiles concise and announces parser issues', () => {
    const summary = new StructuralSummaryFormatter().format(
      { ...structure, parseErrors: [currentFunction.range] },
      new AccessibilityProfileCatalog().get('adhd'),
    );

    expect(summary.lines).not.toContain('Top-level functions:');
    expect(summary.lines.at(-1)).toBe('Parser notice: 1 syntax issues found.');
  });
});
