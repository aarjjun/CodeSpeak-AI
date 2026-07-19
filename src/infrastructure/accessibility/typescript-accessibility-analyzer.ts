import * as ts from 'typescript';
import type { AccessibilityAnalyzer } from '../../application/ports/accessibility/accessibility-analyzer';
import type {
  AccessibilityAuditReport,
  AccessibilityIssue,
  AccessibilityIssueCategory,
  AccessibilityIssueSeverity,
  AccessibilityStandard,
} from '../../domain/accessibility/accessibility-audit';
import type { OperationResult } from '../../domain/shared/operation-error';
import type { SourceRange } from '../../domain/shared/source-location';
import type { WorkspaceDocument } from '../../domain/workspace/workspace-contracts';

const supportedLanguageIds = ['javascriptreact', 'typescriptreact'] as const;
const nativeInteractiveElements = new Set(['button', 'input', 'select', 'textarea', 'summary']);
const interactiveRoles = new Set([
  'button',
  'checkbox',
  'link',
  'menuitem',
  'radio',
  'switch',
  'tab',
]);

export class TypeScriptAccessibilityAnalyzer implements AccessibilityAnalyzer {
  public readonly supportedLanguageIds: readonly string[] = supportedLanguageIds;

  public analyze(
    document: WorkspaceDocument,
    standard: AccessibilityStandard,
    signal?: AbortSignal,
  ): Promise<OperationResult<AccessibilityAuditReport>> {
    if (signal?.aborted === true) {
      return Promise.resolve(this.cancelled());
    }
    if (!supportedLanguageIds.some((languageId) => languageId === document.languageId)) {
      return Promise.resolve({
        ok: false,
        error: {
          code: 'unsupported-language',
          message: 'Accessibility checking currently supports JSX and TSX files.',
          retryable: false,
          recoveryActions: [],
        },
      });
    }

    try {
      const sourceFile = ts.createSourceFile(
        document.uri,
        document.content,
        ts.ScriptTarget.Latest,
        true,
        document.languageId === 'typescriptreact' ? ts.ScriptKind.TSX : ts.ScriptKind.JSX,
      );
      const labelledControlIds = this.collectLabelledControlIds(sourceFile);
      const issues: AccessibilityIssue[] = [];
      const visit = (node: ts.Node): void => {
        if (signal?.aborted === true) {
          return;
        }
        if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
          this.inspectElement(node, sourceFile, labelledControlIds, issues);
        }
        ts.forEachChild(node, visit);
      };
      visit(sourceFile);

      return Promise.resolve({
        ok: true,
        value: {
          uri: document.uri,
          standard,
          issues,
          checkedRuleIds: [
            'jsx-img-alt',
            'jsx-click-keyboard',
            'jsx-interactive-focus',
            'jsx-form-label',
            'jsx-role-name',
            'jsx-anchor-name',
            'jsx-positive-tabindex',
          ],
        },
      });
    } catch (error: unknown) {
      return Promise.resolve({
        ok: false,
        error: {
          code: 'parse-failure',
          message: 'CodeSpeak could not analyze this file for accessibility issues.',
          ...(error instanceof Error ? { technicalMessage: error.message } : {}),
          retryable: true,
          recoveryActions: [],
        },
      });
    }
  }

  private inspectElement(
    node: ts.JsxOpeningLikeElement,
    sourceFile: ts.SourceFile,
    labelledControlIds: ReadonlySet<string>,
    issues: AccessibilityIssue[],
  ): void {
    const tagName = node.tagName.getText(sourceFile);
    if (tagName !== tagName.toLowerCase()) {
      return;
    }
    const attributes = this.attributes(node, sourceFile);
    const range = this.rangeForNode(sourceFile, node);

    if (tagName === 'img' && !attributes.has('alt')) {
      issues.push(
        this.issue(
          'jsx-img-alt',
          'alternative-text',
          'serious',
          'Image is missing alternative text.',
          'Add an alt attribute that describes the image, or alt="" for a decorative image.',
          range,
          'https://www.w3.org/WAI/WCAG22/Understanding/non-text-content.html',
        ),
      );
    }

    const hasClick = attributes.has('onclick');
    const hasKeyboardHandler =
      attributes.has('onkeydown') || attributes.has('onkeyup') || attributes.has('onkeypress');
    const isNativeInteractive =
      nativeInteractiveElements.has(tagName) || (tagName === 'a' && attributes.has('href'));
    if (hasClick && !isNativeInteractive && !hasKeyboardHandler) {
      issues.push(
        this.issue(
          'jsx-click-keyboard',
          'keyboard-access',
          'serious',
          'Clickable element has no keyboard event handler.',
          'Use a native button or link, or provide equivalent keyboard handling.',
          range,
          'https://www.w3.org/WAI/WCAG22/Understanding/keyboard.html',
        ),
      );
    }

    const role = attributes.get('role')?.toLowerCase();
    const actsInteractive = role !== undefined && interactiveRoles.has(role);
    if (actsInteractive && !isNativeInteractive && !attributes.has('tabindex')) {
      issues.push(
        this.issue(
          'jsx-interactive-focus',
          'focus-management',
          'serious',
          'Interactive ARIA element may not be reachable by keyboard.',
          'Prefer a native interactive element or add an appropriate tabIndex.',
          range,
          'https://www.w3.org/WAI/WCAG22/Understanding/keyboard.html',
        ),
      );
    }

    if (
      ['input', 'select', 'textarea'].includes(tagName) &&
      !this.isHiddenInput(tagName, attributes)
    ) {
      const id = attributes.get('id');
      const labelled =
        attributes.has('aria-label') ||
        attributes.has('aria-labelledby') ||
        (id !== undefined && labelledControlIds.has(id)) ||
        this.hasLabelAncestor(node);
      if (!labelled) {
        issues.push(
          this.issue(
            'jsx-form-label',
            'semantic-structure',
            'serious',
            'Form control has no determinable accessible label.',
            'Associate a label element or add aria-label or aria-labelledby.',
            range,
            'https://www.w3.org/WAI/WCAG22/Understanding/labels-or-instructions.html',
          ),
        );
      }
    }

    if (
      actsInteractive &&
      !attributes.has('aria-label') &&
      !attributes.has('aria-labelledby') &&
      !this.hasVisibleText(node)
    ) {
      issues.push(
        this.issue(
          'jsx-role-name',
          'aria',
          'serious',
          'Interactive ARIA element has no determinable accessible name.',
          'Add visible text, aria-label, or aria-labelledby.',
          range,
          'https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html',
        ),
      );
    }

    if (
      tagName === 'a' &&
      attributes.has('href') &&
      !attributes.has('aria-label') &&
      !attributes.has('aria-labelledby') &&
      !this.hasVisibleText(node)
    ) {
      issues.push(
        this.issue(
          'jsx-anchor-name',
          'aria',
          'serious',
          'Link has no determinable accessible name.',
          'Add descriptive link text, aria-label, or aria-labelledby.',
          range,
          'https://www.w3.org/WAI/WCAG22/Understanding/link-purpose-in-context.html',
        ),
      );
    }

    if (this.hasPositiveTabIndex(node, sourceFile)) {
      issues.push(
        this.issue(
          'jsx-positive-tabindex',
          'focus-management',
          'moderate',
          'Positive tabIndex can create an unexpected keyboard focus order.',
          'Use native document order or tabIndex={0} when an element must be focusable.',
          range,
          'https://www.w3.org/WAI/WCAG22/Understanding/focus-order.html',
        ),
      );
    }
  }

  private collectLabelledControlIds(sourceFile: ts.SourceFile): ReadonlySet<string> {
    const ids = new Set<string>();
    const visit = (node: ts.Node): void => {
      if (
        (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) &&
        node.tagName.getText(sourceFile).toLowerCase() === 'label'
      ) {
        const attributes = this.attributes(node, sourceFile);
        const target = attributes.get('htmlfor') ?? attributes.get('for');
        if (target !== undefined) {
          ids.add(target);
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);
    return ids;
  }

  private attributes(
    node: ts.JsxOpeningLikeElement,
    sourceFile: ts.SourceFile,
  ): ReadonlyMap<string, string> {
    const attributes = new Map<string, string>();
    for (const property of node.attributes.properties) {
      if (!ts.isJsxAttribute(property)) {
        continue;
      }
      const name = property.name.getText(sourceFile).toLowerCase();
      attributes.set(name, this.attributeValue(property.initializer));
    }
    return attributes;
  }

  private attributeValue(initializer: ts.JsxAttributeValue | undefined): string {
    if (initializer === undefined) {
      return '';
    }
    if (ts.isStringLiteral(initializer)) {
      return initializer.text;
    }
    if (
      ts.isJsxExpression(initializer) &&
      initializer.expression !== undefined &&
      ts.isStringLiteral(initializer.expression)
    ) {
      return initializer.expression.text;
    }
    return '';
  }

  private hasVisibleText(node: ts.JsxOpeningLikeElement): boolean {
    const parent = node.parent;
    return ts.isJsxElement(parent)
      ? parent.children.some((child) => ts.isJsxText(child) && child.text.trim().length > 0)
      : false;
  }

  private hasLabelAncestor(node: ts.Node): boolean {
    let parent = node.parent;
    while (ts.isJsxElement(parent) || ts.isJsxFragment(parent)) {
      if (
        ts.isJsxElement(parent) &&
        parent.openingElement.tagName.getText().toLowerCase() === 'label'
      ) {
        return true;
      }
      parent = parent.parent;
    }
    return false;
  }

  private isHiddenInput(tagName: string, attributes: ReadonlyMap<string, string>): boolean {
    return tagName === 'input' && attributes.get('type')?.toLowerCase() === 'hidden';
  }

  private hasPositiveTabIndex(node: ts.JsxOpeningLikeElement, sourceFile: ts.SourceFile): boolean {
    for (const property of node.attributes.properties) {
      if (
        !ts.isJsxAttribute(property) ||
        property.name.getText(sourceFile).toLowerCase() !== 'tabindex'
      ) {
        continue;
      }
      const initializer = property.initializer;
      if (initializer === undefined) {
        return false;
      }
      const source = initializer
        .getText(sourceFile)
        .replace(/[{}"']/gu, '')
        .trim();
      const value = Number(source);
      return Number.isFinite(value) && value > 0;
    }
    return false;
  }

  private issue(
    ruleId: string,
    category: AccessibilityIssueCategory,
    severity: AccessibilityIssueSeverity,
    message: string,
    remediation: string,
    range: SourceRange,
    documentationUri: string,
  ): AccessibilityIssue {
    return { ruleId, category, severity, message, remediation, range, documentationUri };
  }

  private rangeForNode(sourceFile: ts.SourceFile, node: ts.Node): SourceRange {
    const start = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
    const end = sourceFile.getLineAndCharacterOfPosition(node.getEnd());
    return {
      start: { line: start.line, character: start.character },
      end: { line: end.line, character: end.character },
    };
  }

  private cancelled(): OperationResult<never> {
    return {
      ok: false,
      error: {
        code: 'cancelled',
        message: 'Accessibility checking was cancelled.',
        retryable: true,
        recoveryActions: [],
      },
    };
  }
}
