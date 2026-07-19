import { describe, expect, it, vi } from 'vitest';
import type { AccessibilityAnalyzer } from '../../../src/application/ports/accessibility/accessibility-analyzer';
import type { AccessibilityReportGateway } from '../../../src/application/ports/accessibility/accessibility-report-gateway';
import type { EditorGateway } from '../../../src/application/ports/platform/editor-gateway';
import type { UserInterfaceGateway } from '../../../src/application/ports/platform/user-interface-gateway';
import { CheckActiveDocumentAccessibility } from '../../../src/application/use-cases/accessibility/check-active-document-accessibility';
import type { AccessibilityAuditReport } from '../../../src/domain/accessibility/accessibility-audit';

const report: AccessibilityAuditReport = {
  uri: 'file:///View.tsx',
  standard: 'WCAG-2.2-AA',
  checkedRuleIds: ['jsx-img-alt'],
  issues: [
    {
      ruleId: 'jsx-img-alt',
      category: 'alternative-text',
      severity: 'serious',
      message: 'Image is missing alternative text.',
      remediation: 'Add an alt attribute.',
      range: { start: { line: 1, character: 2 }, end: { line: 1, character: 20 } },
    },
  ],
};

function createEditor(active = true): {
  editor: EditorGateway;
  showPreview: ReturnType<typeof vi.fn>;
} {
  const showPreview = vi.fn().mockResolvedValue(undefined);
  return {
    showPreview,
    editor: {
      getActiveDocument: () =>
        Promise.resolve(
          active
            ? { uri: report.uri, languageId: 'typescriptreact', version: 1, content: '<img />' }
            : undefined,
        ),
      getSelection: () => Promise.resolve(undefined),
      insertText: () => Promise.resolve(false),
      applyEdit: () => Promise.resolve(false),
      showPreview,
      openDocument: () => Promise.resolve(false),
      revealPosition: () => Promise.resolve(),
      undo: () => Promise.resolve(),
      redo: () => Promise.resolve(),
    },
  };
}

function createUserInterface(): {
  ui: UserInterfaceGateway;
  announce: ReturnType<typeof vi.fn>;
  warning: ReturnType<typeof vi.fn>;
} {
  const announce = vi.fn().mockResolvedValue(undefined);
  const warning = vi.fn().mockResolvedValue(undefined);
  return {
    announce,
    warning,
    ui: {
      announce,
      showInformation: () => Promise.resolve(),
      showWarning: warning,
      showError: () => Promise.resolve(),
      choose: () => Promise.resolve(undefined),
      requestText: () => Promise.resolve(undefined),
      confirm: () => Promise.resolve(false),
      showProgress: (_title, operation) => operation(new AbortController().signal),
    },
  };
}

describe('CheckActiveDocumentAccessibility', () => {
  it('publishes findings, renders a preview, and announces the count', async () => {
    const analyzer: AccessibilityAnalyzer = {
      supportedLanguageIds: ['typescriptreact'],
      analyze: () => Promise.resolve({ ok: true, value: report }),
    };
    const publish = vi.fn();
    const reports: AccessibilityReportGateway = { publish, clear: vi.fn() };
    const { editor, showPreview } = createEditor();
    const { ui, announce } = createUserInterface();
    await new CheckActiveDocumentAccessibility(analyzer, reports, editor, ui).execute();
    expect(publish).toHaveBeenCalledWith(report);
    expect(showPreview).toHaveBeenCalledWith(
      'CodeSpeak accessibility check',
      expect.stringContaining('Rule: jsx-img-alt'),
      'markdown',
    );
    expect(announce).toHaveBeenCalledWith(expect.stringContaining('1 accessibility issues found'));
  });

  it('does not run the analyzer without an active document', async () => {
    const analyze = vi.fn();
    const { editor } = createEditor(false);
    const { ui, warning } = createUserInterface();
    await new CheckActiveDocumentAccessibility(
      { supportedLanguageIds: [], analyze },
      { publish: vi.fn(), clear: vi.fn() },
      editor,
      ui,
    ).execute();
    expect(analyze).not.toHaveBeenCalled();
    expect(warning).toHaveBeenCalledWith('Open a JSX or TSX file before checking accessibility.');
  });
});
