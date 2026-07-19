import type { AccessibilityAuditReport } from '../../../domain/accessibility/accessibility-audit';
import type { DocumentUri } from '../../../domain/shared/source-location';

export interface AccessibilityReportGateway {
  publish(report: AccessibilityAuditReport): void;
  clear(uri?: DocumentUri): void;
}
