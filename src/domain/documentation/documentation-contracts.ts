import type { SourceReference } from '../shared/source-location';

export type DocumentationStyle = 'docstring' | 'jsdoc' | 'javadoc' | 'doxygen';

export interface DocumentationRequest {
  readonly languageId: string;
  readonly sourceCode: string;
  readonly source: SourceReference;
  readonly preferredStyle?: DocumentationStyle;
}

export interface GeneratedDocumentation {
  readonly content: string;
  readonly style: DocumentationStyle;
  readonly target: SourceReference;
}
