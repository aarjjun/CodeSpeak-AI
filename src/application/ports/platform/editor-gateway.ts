import type { ProposedCodeEdit } from '../../../domain/diagnostics/diagnostic-contracts';
import type {
  DocumentUri,
  SourcePosition,
  SourceRange,
} from '../../../domain/shared/source-location';
import type { WorkspaceDocument } from '../../../domain/workspace/workspace-contracts';

export interface EditorSelection {
  readonly text: string;
  readonly range: SourceRange;
}

export interface EditorGateway {
  getActiveDocument(): Promise<WorkspaceDocument | undefined>;
  getSelection(): Promise<EditorSelection | undefined>;
  insertText(text: string): Promise<boolean>;
  applyEdit(edit: ProposedCodeEdit): Promise<boolean>;
  showPreview(title: string, content: string, languageId: string): Promise<void>;
  openDocument(uri: DocumentUri): Promise<boolean>;
  revealPosition(position: SourcePosition): Promise<void>;
  undo(): Promise<void>;
  redo(): Promise<void>;
}
