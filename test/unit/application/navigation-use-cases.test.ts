import { describe, expect, it, vi } from 'vitest';
import type { DiagnosticsGateway } from '../../../src/application/ports/platform/diagnostics-gateway';
import type { EditorGateway } from '../../../src/application/ports/platform/editor-gateway';
import type { UserInterfaceGateway } from '../../../src/application/ports/platform/user-interface-gateway';
import type { WorkspaceGateway } from '../../../src/application/ports/platform/workspace-gateway';
import { NavigateDiagnostics } from '../../../src/application/use-cases/diagnostics/navigate-diagnostics';
import { OpenFile } from '../../../src/application/use-cases/workspace/open-file';
import type { CodeDiagnostic } from '../../../src/domain/diagnostics/diagnostic-contracts';

function editor(opened = true): {
  gateway: EditorGateway;
  openDocument: ReturnType<typeof vi.fn>;
  revealPosition: ReturnType<typeof vi.fn>;
} {
  const openDocument = vi.fn().mockResolvedValue(opened);
  const revealPosition = vi.fn().mockResolvedValue(undefined);
  return {
    openDocument,
    revealPosition,
    gateway: {
      getActiveDocument: () => Promise.resolve(undefined),
      getSelection: () => Promise.resolve(undefined),
      insertText: () => Promise.resolve(false),
      applyEdit: () => Promise.resolve(false),
      showPreview: () => Promise.resolve(),
      openDocument,
      revealPosition,
      undo: () => Promise.resolve(),
      redo: () => Promise.resolve(),
    },
  };
}

function ui(selected?: string): {
  gateway: UserInterfaceGateway;
  information: ReturnType<typeof vi.fn>;
  announce: ReturnType<typeof vi.fn>;
} {
  const information = vi.fn().mockResolvedValue(undefined);
  const announce = vi.fn().mockResolvedValue(undefined);
  return {
    information,
    announce,
    gateway: {
      announce,
      showInformation: information,
      showWarning: () => Promise.resolve(),
      showError: () => Promise.resolve(),
      choose: () => Promise.resolve(selected),
      requestText: () => Promise.resolve(undefined),
      confirm: () => Promise.resolve(false),
      showProgress: (_title, operation) => operation(new AbortController().signal),
    },
  };
}

describe('navigation use cases', () => {
  it('opens a matching workspace file selected through the accessible picker', async () => {
    const uri = 'file:///workspace/src/app.ts';
    const workspace: WorkspaceGateway = {
      hasOpenWorkspace: () => true,
      isTrusted: () => true,
      getContainingFolder: (uri) => uri,
      findFiles: () => Promise.resolve([uri]),
      readDocument: () =>
        Promise.resolve({ uri, languageId: 'typescript', version: 1, content: '' }),
      listContextDocuments: () => Promise.resolve([]),
    };
    const targetEditor = editor();
    await new OpenFile(workspace, targetEditor.gateway, ui(uri).gateway).execute('app.ts');
    expect(targetEditor.openDocument).toHaveBeenCalledWith(uri);
  });

  it('reports an empty file search without opening a document', async () => {
    const workspace: WorkspaceGateway = {
      hasOpenWorkspace: () => true,
      isTrusted: () => true,
      getContainingFolder: (uri) => uri,
      findFiles: () => Promise.resolve([]),
      readDocument: () =>
        Promise.resolve({
          uri: 'file:///unused',
          languageId: 'plaintext',
          version: 1,
          content: '',
        }),
      listContextDocuments: () => Promise.resolve([]),
    };
    const targetEditor = editor();
    const interfaceState = ui();
    await new OpenFile(workspace, targetEditor.gateway, interfaceState.gateway).execute(
      'missing.ts',
    );
    expect(interfaceState.information).toHaveBeenCalledWith('No files matched “missing.ts”.');
    expect(targetEditor.openDocument).not.toHaveBeenCalled();
  });

  it('opens and reveals the selected diagnostic', async () => {
    const diagnostic: CodeDiagnostic = {
      id: 'diagnostic-1',
      message: 'Type mismatch',
      severity: 'error',
      location: {
        uri: 'file:///workspace/app.ts',
        range: {
          start: { line: 4, character: 2 },
          end: { line: 4, character: 6 },
        },
      },
    };
    const diagnostics: DiagnosticsGateway = {
      getForWorkspace: () => [diagnostic],
      getForDocument: () => [diagnostic],
    };
    const targetEditor = editor();
    const interfaceState = ui(diagnostic.id);
    await new NavigateDiagnostics(
      diagnostics,
      targetEditor.gateway,
      interfaceState.gateway,
    ).execute();
    expect(targetEditor.openDocument).toHaveBeenCalledWith(diagnostic.location.uri);
    expect(targetEditor.revealPosition).toHaveBeenCalledWith(diagnostic.location.range?.start);
    expect(interfaceState.announce).toHaveBeenCalledWith(diagnostic.message);
  });
});
