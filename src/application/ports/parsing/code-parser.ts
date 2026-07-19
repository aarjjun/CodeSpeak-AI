import type { CodeStructure } from '../../../domain/code-intelligence/code-structure';
import type { OperationResult } from '../../../domain/shared/operation-error';
import type { WorkspaceDocument } from '../../../domain/workspace/workspace-contracts';

export interface CodeParser {
  readonly supportedLanguageIds: readonly string[];

  supports(languageId: string): boolean;

  parse(document: WorkspaceDocument, signal?: AbortSignal): Promise<OperationResult<CodeStructure>>;

  invalidate(uri: string): void;
}
