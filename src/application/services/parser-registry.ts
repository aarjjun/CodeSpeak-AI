import type { CodeParser } from '../ports/parsing/code-parser';
import type { CodeStructure } from '../../domain/code-intelligence/code-structure';
import type { OperationResult } from '../../domain/shared/operation-error';
import type { WorkspaceDocument } from '../../domain/workspace/workspace-contracts';

export class ParserRegistry implements CodeParser {
  public constructor(private readonly parsers: readonly CodeParser[]) {}

  public get supportedLanguageIds(): readonly string[] {
    return [...new Set(this.parsers.flatMap((parser) => parser.supportedLanguageIds))];
  }

  public supports(languageId: string): boolean {
    return this.parsers.some((parser) => parser.supports(languageId));
  }

  public async parse(
    document: WorkspaceDocument,
    signal?: AbortSignal,
  ): Promise<OperationResult<CodeStructure>> {
    if (signal?.aborted === true) {
      return {
        ok: false,
        error: {
          code: 'cancelled',
          message: 'Code analysis was cancelled.',
          retryable: true,
          recoveryActions: [],
        },
      };
    }

    const parser = this.parsers.find((candidate) => candidate.supports(document.languageId));
    if (parser === undefined) {
      return {
        ok: false,
        error: {
          code: 'unsupported-language',
          message: `CodeSpeak does not yet support ${document.languageId} structure analysis.`,
          retryable: false,
          recoveryActions: [],
        },
      };
    }

    return parser.parse(document, signal);
  }

  public invalidate(uri: string): void {
    for (const parser of this.parsers) {
      parser.invalidate(uri);
    }
  }
}
