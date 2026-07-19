import type { EditorGateway } from '../../ports/platform/editor-gateway';
import type { UserInterfaceGateway } from '../../ports/platform/user-interface-gateway';
import type { WorkspaceGateway } from '../../ports/platform/workspace-gateway';
import type { DocumentUri } from '../../../domain/shared/source-location';

const MAXIMUM_RESULTS = 100;

export class OpenFile {
  public constructor(
    private readonly workspace: WorkspaceGateway,
    private readonly editor: EditorGateway,
    private readonly userInterface: UserInterfaceGateway,
  ) {}

  public async execute(initialQuery?: string): Promise<void> {
    if (!this.workspace.hasOpenWorkspace()) {
      await this.userInterface.showWarning('Open a workspace before searching for a file.');
      return;
    }

    const query =
      initialQuery ??
      (await this.userInterface.requestText('Open a workspace file', {
        placeHolder: 'Enter part of a file name, or leave blank to browse',
      }));
    if (query === undefined) {
      return;
    }

    const matches = await this.workspace.findFiles(query, MAXIMUM_RESULTS);
    if (matches.length === 0) {
      await this.userInterface.showInformation(`No files matched “${query}”.`);
      return;
    }

    const selectedUri = await this.userInterface.choose(
      `${matches.length.toString()} matching workspace files`,
      matches.map((uri) => ({
        id: uri,
        label: this.getFileName(uri),
        description: this.getReadableLocation(uri),
      })),
    );
    if (selectedUri === undefined) {
      return;
    }

    const opened = await this.editor.openDocument(selectedUri);
    if (!opened) {
      await this.userInterface.showError('CodeSpeak could not open the selected file.');
    }
  }

  private getFileName(uri: DocumentUri): string {
    const segments = this.getReadableLocation(uri).split('/');
    return segments.at(-1) ?? uri;
  }

  private getReadableLocation(uri: DocumentUri): string {
    try {
      return decodeURIComponent(uri)
        .replace(/^file:\/\/+/, '')
        .replaceAll('\\', '/');
    } catch {
      return uri;
    }
  }
}
