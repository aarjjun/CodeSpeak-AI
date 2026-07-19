import type { CodeDiagnostic } from '../../../domain/diagnostics/diagnostic-contracts';
import type { DocumentUri } from '../../../domain/shared/source-location';

export interface DiagnosticsGateway {
  getForDocument(uri: DocumentUri): readonly CodeDiagnostic[];
  getForWorkspace(): readonly CodeDiagnostic[];
}
