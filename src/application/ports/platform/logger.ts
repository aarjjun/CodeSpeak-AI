export type LogMetadata = Readonly<Record<string, string | number | boolean | undefined>>;

export interface Logger {
  debug(message: string, metadata?: LogMetadata): void;
  info(message: string, metadata?: LogMetadata): void;
  warn(message: string, metadata?: LogMetadata): void;
  error(message: string, error?: unknown, metadata?: LogMetadata): void;
}
