import { describe, expect, it } from 'vitest';
import { TypeScriptAccessibilityAnalyzer } from '../../../src/infrastructure/accessibility/typescript-accessibility-analyzer';

describe('TypeScriptAccessibilityAnalyzer', () => {
  it('detects deterministic JSX accessibility failures', async () => {
    const analyzer = new TypeScriptAccessibilityAnalyzer();
    const result = await analyzer.analyze(
      {
        uri: 'file:///component.tsx',
        languageId: 'typescriptreact',
        version: 1,
        content: `
          export function Component() {
            return <main>
              <img src="avatar.png" />
              <div onClick={() => openProfile()}>Open</div>
              <span role="button" onClick={() => save()} />
              <input type="text" />
            </main>;
          }
        `,
      },
      'WCAG-2.2-AA',
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      const ruleIds = result.value.issues.map((issue) => issue.ruleId);
      expect(ruleIds).toContain('jsx-img-alt');
      expect(ruleIds).toContain('jsx-click-keyboard');
      expect(ruleIds).toContain('jsx-interactive-focus');
      expect(ruleIds).toContain('jsx-form-label');
      expect(ruleIds).toContain('jsx-role-name');
    }
  });

  it('recognizes native controls and explicit labels without false positives', async () => {
    const analyzer = new TypeScriptAccessibilityAnalyzer();
    const result = await analyzer.analyze(
      {
        uri: 'file:///accessible.tsx',
        languageId: 'typescriptreact',
        version: 1,
        content: `
          export function Accessible() {
            return <main>
              <img src="separator.png" alt="" />
              <button onClick={() => save()}>Save</button>
              <label htmlFor="email">Email</label>
              <input id="email" type="email" />
              <span role="button" tabIndex={0} onClick={() => save()} onKeyDown={() => save()}>Save</span>
            </main>;
          }
        `,
      },
      'WCAG-2.2-AA',
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.issues).toHaveLength(0);
    }
  });
});
