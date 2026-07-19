import type {
  AccessibilityAuditReport,
  AccessibilityStandard,
} from '../../../domain/accessibility/accessibility-audit';
import type { OperationResult } from '../../../domain/shared/operation-error';
import type { WorkspaceDocument } from '../../../domain/workspace/workspace-contracts';

export interface AccessibilityAnalyzer {
  readonly supportedLanguageIds: readonly string[];

  analyze(
    document: WorkspaceDocument,
    standard: AccessibilityStandard,
    signal?: AbortSignal,
  ): Promise<OperationResult<AccessibilityAuditReport>>;
}
