import type { SourceReference } from '../shared/source-location';
import type { OperationResult } from '../shared/operation-error';

export type AiCapability =
  | 'chat'
  | 'code-generation'
  | 'code-explanation'
  | 'diagnostic-explanation'
  | 'documentation-generation'
  | 'learning-assistance'
  | 'summary-generation';

export type AiContextKind =
  | 'active-document'
  | 'selection'
  | 'diagnostic'
  | 'code-structure'
  | 'workspace-summary'
  | 'conversation';

export interface AiContextItem {
  readonly kind: AiContextKind;
  readonly content: string;
  readonly source?: SourceReference;
  readonly languageId?: string;
}

export type PromptVariables = Readonly<Record<string, string>>;

export interface AiRequest {
  readonly capability: AiCapability;
  readonly promptId: string;
  readonly input: PromptVariables;
  readonly context: readonly AiContextItem[];
  readonly model?: string;
}

export interface AiOutputParser<TOutput> {
  readonly jsonSchema: Readonly<Record<string, unknown>>;
  parse(value: unknown): OperationResult<TOutput>;
}

export interface AiUsage {
  readonly inputTokens?: number;
  readonly outputTokens?: number;
}

export interface AiResponse<TOutput> {
  readonly output: TOutput;
  readonly model: string;
  readonly usage?: AiUsage;
}
