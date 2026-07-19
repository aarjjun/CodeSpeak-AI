import type * as vscode from 'vscode';
import { createServiceContainer } from './bootstrap/service-container';
import { registerCommands } from './presentation/commands/register-commands';

export function activate(context: vscode.ExtensionContext): void {
  const services = createServiceContainer(context);
  registerCommands(context, services);
  services.logger.info('CodeSpeak AI activated.');
}

export function deactivate(): void {
  // Resources are owned by ExtensionContext subscriptions.
}
