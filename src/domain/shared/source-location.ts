export type DocumentUri = string;

export interface SourcePosition {
  readonly line: number;
  readonly character: number;
}

export interface SourceRange {
  readonly start: SourcePosition;
  readonly end: SourcePosition;
}

export interface SourceReference {
  readonly uri: DocumentUri;
  readonly range?: SourceRange;
}
