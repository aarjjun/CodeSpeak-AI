import * as vscode from 'vscode';
import { posix } from 'node:path';
import type { WorkspaceGateway } from '../../application/ports/platform/workspace-gateway';
import type { DocumentUri } from '../../domain/shared/source-location';
import type {
  WorkspaceContextPolicy,
  WorkspaceDocument,
} from '../../domain/workspace/workspace-contracts';

export class VsCodeWorkspaceGateway implements WorkspaceGateway {
  public hasOpenWorkspace(): boolean {
    return (vscode.workspace.workspaceFolders?.length ?? 0) > 0;
  }

  public isTrusted(): boolean {
    return vscode.workspace.isTrusted;
  }

  public async findFiles(query: string, maximumResults: number): Promise<readonly DocumentUri[]> {
    const normalizedQuery = query.trim();
    const include = normalizedQuery.length === 0 ? '**/*' : `**/*${normalizedQuery}*`;
    const uris = await vscode.workspace.findFiles(
      include,
      '**/{node_modules,.git,dist,coverage}/**',
      maximumResults,
    );
    return uris.map((uri) => uri.toString());
  }

  public async readDocument(uri: DocumentUri): Promise<WorkspaceDocument> {
    const document = await vscode.workspace.openTextDocument(vscode.Uri.parse(uri));
    return {
      uri: document.uri.toString(),
      languageId: document.languageId,
      version: document.version,
      content: document.getText(),
    };
  }

  public async listContextDocuments(
    policy: WorkspaceContextPolicy,
    scopeUri?: DocumentUri,
  ): Promise<readonly DocumentUri[]> {
    const defaultExclusions = [
      '**/node_modules/**',
      '**/.git/**',
      '**/{dist,coverage,build,out,.next}/**',
      '**/{.env,.env.*,*.pem,*.key,*.p12,*.pfx,*.jks,credentials.*,secrets.*}',
    ];
    if (!policy.includeHiddenFiles) {
      defaultExclusions.push('**/.*', '**/.*/**');
    }

    const exclusions = [...defaultExclusions, ...policy.excludedPatterns];
    const includePattern =
      policy.includedPatterns.length === 1
        ? (policy.includedPatterns[0] ?? '**/*')
        : `{${policy.includedPatterns.join(',')}}`;
    const include =
      scopeUri === undefined
        ? includePattern
        : new vscode.RelativePattern(vscode.Uri.parse(scopeUri), includePattern);
    const uris = await vscode.workspace.findFiles(
      include,
      `{${exclusions.join(',')}}`,
      policy.maximumFiles,
    );
    return uris.map((uri) => uri.toString());
  }

  public getContainingFolder(uri: DocumentUri): DocumentUri {
    const parsed = vscode.Uri.parse(uri);
    return parsed.with({ path: posix.dirname(parsed.path) }).toString();
  }
}
