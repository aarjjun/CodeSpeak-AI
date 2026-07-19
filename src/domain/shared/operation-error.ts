export type OperationErrorCode =
  | 'configuration'
  | 'authentication'
  | 'network-unavailable'
  | 'rate-limited'
  | 'provider-unavailable'
  | 'speech-failure'
  | 'parse-failure'
  | 'unsupported-language'
  | 'no-active-editor'
  | 'workspace-required'
  | 'invalid-response'
  | 'cancelled'
  | 'unexpected';

export interface RecoveryAction {
  readonly id: string;
  readonly label: string;
  readonly commandId?: string;
}

export interface OperationError {
  readonly code: OperationErrorCode;
  readonly message: string;
  readonly technicalMessage?: string;
  readonly retryable: boolean;
  readonly recoveryActions: readonly RecoveryAction[];
}

export type OperationResult<T> =
  { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: OperationError };
