import type { SourceReference } from '../shared/source-location';

export type DiagnosticSeverity = 'error' | 'warning' | 'information' | 'hint';

export interface CodeDiagnostic {
  readonly id: string;
  readonly message: string;
  readonly code?: string;
  readonly source?: string;
  readonly severity: DiagnosticSeverity;
  readonly location: SourceReference;
}

export interface DiagnosticExplanation {
  readonly diagnosticId: string;
  readonly plainLanguageExplanation: string;
  readonly likelyCause?: string;
  readonly suggestedNextSteps: readonly string[];
}

export interface ProposedCodeEdit {
  readonly explanation: string;
  readonly replacement: string;
  readonly target: SourceReference;
}
