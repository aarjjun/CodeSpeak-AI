import type { DocumentUri } from '../shared/source-location';

export interface WorkspaceDocument {
  readonly uri: DocumentUri;
  readonly languageId: string;
  readonly version: number;
  readonly content: string;
}

export interface DocumentSummary {
  readonly uri: DocumentUri;
  readonly purpose: string;
  readonly keySymbols: readonly string[];
  readonly dependencies: readonly string[];
}

export interface WorkspaceFolderSummary {
  readonly uri: DocumentUri;
  readonly purpose: string;
  readonly importantFiles: readonly DocumentUri[];
  readonly documentSummaries: readonly DocumentSummary[];
  readonly childSummaries: readonly WorkspaceFolderSummary[];
}

export interface WorkspaceSummary {
  readonly name: string;
  readonly purpose: string;
  readonly rootFolders: readonly WorkspaceFolderSummary[];
  readonly generatedAt: string;
}

export interface WorkspaceContextPolicy {
  readonly maximumFiles: number;
  readonly maximumCharactersPerFile: number;
  readonly includedPatterns: readonly string[];
  readonly excludedPatterns: readonly string[];
  readonly includeHiddenFiles: boolean;
}
