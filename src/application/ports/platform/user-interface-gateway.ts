export type AnnouncementPriority = 'polite' | 'assertive';

export interface UserChoice {
  readonly id: string;
  readonly label: string;
  readonly description?: string;
}

export interface TextInputOptions {
  readonly password?: boolean;
  readonly placeHolder?: string;
  readonly value?: string;
}

export interface UserInterfaceGateway {
  announce(message: string, priority?: AnnouncementPriority): Promise<void>;
  showInformation(message: string): Promise<void>;
  showWarning(message: string): Promise<void>;
  showError(message: string): Promise<void>;
  choose(prompt: string, choices: readonly UserChoice[]): Promise<string | undefined>;
  requestText(prompt: string, options?: TextInputOptions): Promise<string | undefined>;
  confirm(prompt: string): Promise<boolean>;
  showProgress<T>(title: string, operation: (signal: AbortSignal) => Promise<T>): Promise<T>;
}
