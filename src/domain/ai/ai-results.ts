export interface GeneratedCodeResult {
  readonly code: string;
  readonly explanation: string;
  readonly languageId: string;
}

export interface CodeExplanationResult {
  readonly summary: string;
  readonly details: readonly string[];
  readonly whyItWorks: string;
  readonly alternatives: readonly string[];
  readonly considerations: readonly string[];
}

export interface DiagnosticExplanationResult {
  readonly plainLanguageExplanation: string;
  readonly likelyCause: string;
  readonly suggestedNextSteps: readonly string[];
}

export interface DocumentationGenerationResult {
  readonly documentation: string;
  readonly style: 'docstring' | 'jsdoc' | 'javadoc' | 'doxygen';
  readonly explanation: string;
  readonly usageExample: string | undefined;
}

export interface LearningAssistanceResult {
  readonly explanation: string;
  readonly example: string;
  readonly exercise: string;
  readonly feedback: string;
}

export type CodeSummaryScope = 'file' | 'folder' | 'workspace';

export interface ImportantFileSummary {
  readonly path: string;
  readonly purpose: string;
}

export interface CodeSummaryResult {
  readonly title: string;
  readonly overview: string;
  readonly responsibilities: readonly string[];
  readonly architecture: readonly string[];
  readonly importantFiles: readonly ImportantFileSummary[];
  readonly entryPoints: readonly string[];
  readonly cautions: readonly string[];
}
