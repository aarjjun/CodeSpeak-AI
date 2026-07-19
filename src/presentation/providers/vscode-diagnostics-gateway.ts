import * as vscode from 'vscode';
import type { DiagnosticsGateway } from '../../application/ports/platform/diagnostics-gateway';
import type {
  CodeDiagnostic,
  DiagnosticSeverity,
} from '../../domain/diagnostics/diagnostic-contracts';
import type { DocumentUri } from '../../domain/shared/source-location';

export class VsCodeDiagnosticsGateway implements DiagnosticsGateway {
  public getForDocument(uri: DocumentUri): readonly CodeDiagnostic[] {
    const parsedUri = vscode.Uri.parse(uri);
    return vscode.languages
      .getDiagnostics(parsedUri)
      .map((diagnostic, index) => this.mapDiagnostic(parsedUri, diagnostic, index));
  }

  public getForWorkspace(): readonly CodeDiagnostic[] {
    return vscode.languages
      .getDiagnostics()
      .flatMap(([uri, diagnostics]) =>
        diagnostics.map((diagnostic, index) => this.mapDiagnostic(uri, diagnostic, index)),
      );
  }

  private mapDiagnostic(
    uri: vscode.Uri,
    diagnostic: vscode.Diagnostic,
    index: number,
  ): CodeDiagnostic {
    const code = typeof diagnostic.code === 'object' ? diagnostic.code.value : diagnostic.code;
    return {
      id: [
        uri.toString(),
        diagnostic.range.start.line.toString(),
        diagnostic.range.start.character.toString(),
        index.toString(),
      ].join(':'),
      message: diagnostic.message,
      ...(code === undefined ? {} : { code: code.toString() }),
      ...(diagnostic.source === undefined ? {} : { source: diagnostic.source }),
      severity: this.mapSeverity(diagnostic.severity),
      location: {
        uri: uri.toString(),
        range: {
          start: {
            line: diagnostic.range.start.line,
            character: diagnostic.range.start.character,
          },
          end: {
            line: diagnostic.range.end.line,
            character: diagnostic.range.end.character,
          },
        },
      },
    };
  }

  private mapSeverity(severity: vscode.DiagnosticSeverity): DiagnosticSeverity {
    switch (severity) {
      case vscode.DiagnosticSeverity.Error:
        return 'error';
      case vscode.DiagnosticSeverity.Warning:
        return 'warning';
      case vscode.DiagnosticSeverity.Information:
        return 'information';
      case vscode.DiagnosticSeverity.Hint:
        return 'hint';
    }
  }
}
