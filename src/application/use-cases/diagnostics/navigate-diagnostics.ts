import type { DiagnosticsGateway } from '../../ports/platform/diagnostics-gateway';
import type { EditorGateway } from '../../ports/platform/editor-gateway';
import type { UserInterfaceGateway } from '../../ports/platform/user-interface-gateway';
import type { CodeDiagnostic } from '../../../domain/diagnostics/diagnostic-contracts';

const MAXIMUM_DIAGNOSTICS = 100;

export class NavigateDiagnostics {
  public constructor(
    private readonly diagnostics: DiagnosticsGateway,
    private readonly editor: EditorGateway,
    private readonly userInterface: UserInterfaceGateway,
  ) {}

  public async execute(): Promise<void> {
    const diagnostics = this.diagnostics.getForWorkspace().slice(0, MAXIMUM_DIAGNOSTICS);
    if (diagnostics.length === 0) {
      await this.userInterface.showInformation('No workspace diagnostics were found.');
      return;
    }

    const selectedId = await this.userInterface.choose(
      `${diagnostics.length.toString()} workspace diagnostics`,
      diagnostics.map((diagnostic) => ({
        id: diagnostic.id,
        label: `${this.severityLabel(diagnostic)}: ${diagnostic.message}`,
        description: this.locationLabel(diagnostic),
      })),
    );
    const selected = diagnostics.find((diagnostic) => diagnostic.id === selectedId);
    if (selected === undefined) {
      return;
    }

    const opened = await this.editor.openDocument(selected.location.uri);
    if (!opened) {
      await this.userInterface.showError('CodeSpeak could not open the diagnostic location.');
      return;
    }
    if (selected.location.range !== undefined) {
      await this.editor.revealPosition(selected.location.range.start);
    }
    await this.userInterface.announce(selected.message);
  }

  private severityLabel(diagnostic: CodeDiagnostic): string {
    return diagnostic.severity.charAt(0).toUpperCase() + diagnostic.severity.slice(1);
  }

  private locationLabel(diagnostic: CodeDiagnostic): string {
    const line = diagnostic.location.range?.start.line;
    return line === undefined
      ? diagnostic.location.uri
      : `${diagnostic.location.uri}, line ${(line + 1).toString()}`;
  }
}
