import type { DocumentUri, SourceRange } from '../shared/source-location';

export type AccessibilityStandard = 'WCAG-2.2-A' | 'WCAG-2.2-AA';

export type AccessibilityIssueSeverity = 'critical' | 'serious' | 'moderate' | 'minor';

export type AccessibilityIssueCategory =
  | 'alternative-text'
  | 'aria'
  | 'color-contrast'
  | 'focus-management'
  | 'keyboard-access'
  | 'semantic-structure'
  | 'other';

export interface AccessibilityIssue {
  readonly ruleId: string;
  readonly category: AccessibilityIssueCategory;
  readonly severity: AccessibilityIssueSeverity;
  readonly message: string;
  readonly remediation: string;
  readonly range: SourceRange;
  readonly documentationUri?: string;
}

export interface AccessibilityAuditReport {
  readonly uri: DocumentUri;
  readonly standard: AccessibilityStandard;
  readonly issues: readonly AccessibilityIssue[];
  readonly checkedRuleIds: readonly string[];
}
