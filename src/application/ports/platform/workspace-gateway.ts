import type { DocumentUri } from '../../../domain/shared/source-location';
import type {
  WorkspaceContextPolicy,
  WorkspaceDocument,
} from '../../../domain/workspace/workspace-contracts';

export interface WorkspaceGateway {
  hasOpenWorkspace(): boolean;
  isTrusted(): boolean;
  findFiles(query: string, maximumResults: number): Promise<readonly DocumentUri[]>;
  readDocument(uri: DocumentUri): Promise<WorkspaceDocument>;
  getContainingFolder(uri: DocumentUri): DocumentUri;
  listContextDocuments(
    policy: WorkspaceContextPolicy,
    scopeUri?: DocumentUri,
  ): Promise<readonly DocumentUri[]>;
}
