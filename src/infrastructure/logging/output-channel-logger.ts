import type * as vscode from 'vscode';
import type { Logger, LogMetadata } from '../../application/ports/platform/logger';

const SENSITIVE_KEY = /api[-_]?key|authorization|secret|token|source|content|prompt/i;

export class OutputChannelLogger implements Logger {
  public constructor(private readonly channel: vscode.OutputChannel) {}

  public debug(message: string, metadata?: LogMetadata): void {
    this.write('DEBUG', message, metadata);
  }

  public info(message: string, metadata?: LogMetadata): void {
    this.write('INFO', message, metadata);
  }

  public warn(message: string, metadata?: LogMetadata): void {
    this.write('WARN', message, metadata);
  }

  public error(message: string, error?: unknown, metadata?: LogMetadata): void {
    const safeError = error instanceof Error ? `${error.name}: ${error.message}` : undefined;
    this.write('ERROR', safeError === undefined ? message : `${message} (${safeError})`, metadata);
  }

  private write(level: string, message: string, metadata?: LogMetadata): void {
    const timestamp = new Date().toISOString();
    const safeMetadata = metadata === undefined ? '' : ` ${JSON.stringify(this.redact(metadata))}`;
    this.channel.appendLine(`${timestamp} [${level}] ${message}${safeMetadata}`);
  }

  private redact(metadata: LogMetadata): LogMetadata {
    return Object.fromEntries(
      Object.entries(metadata).map(([key, value]) => [
        key,
        SENSITIVE_KEY.test(key) ? '[REDACTED]' : value,
      ]),
    );
  }
}
