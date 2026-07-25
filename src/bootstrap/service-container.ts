import * as vscode from 'vscode';
import type { ConfigurationGateway } from '../application/ports/platform/configuration-gateway';
import type { AiProvider } from '../application/ports/ai/ai-provider';
import type { AccessibilityAnalyzer } from '../application/ports/accessibility/accessibility-analyzer';
import type { AccessibilityReportGateway } from '../application/ports/accessibility/accessibility-report-gateway';
import type { CodeParser } from '../application/ports/parsing/code-parser';
import { AccessibilityProfileService } from '../application/services/accessibility-profile-service';
import { ParserRegistry } from '../application/services/parser-registry';
import type { DiagnosticsGateway } from '../application/ports/platform/diagnostics-gateway';
import type { EditorGateway } from '../application/ports/platform/editor-gateway';
import type { Logger } from '../application/ports/platform/logger';
import type { UserInterfaceGateway } from '../application/ports/platform/user-interface-gateway';
import type { WorkspaceGateway } from '../application/ports/platform/workspace-gateway';
import type { SecretStore, StateStore } from '../application/ports/persistence/persistence-ports';
import { VsCodeConfigurationGateway } from '../config/vscode-configuration-gateway';
import { OutputChannelLogger } from '../infrastructure/logging/output-channel-logger';
import { GeminiProvider } from '../infrastructure/ai/gemini/gemini-provider';
import { OpenAiProvider } from '../infrastructure/ai/openai/openai-provider';
import { FallbackAiProvider } from '../infrastructure/ai/fallback/fallback-ai-provider';
import { TypeScriptAccessibilityAnalyzer } from '../infrastructure/accessibility/typescript-accessibility-analyzer';
import { FilePromptRepository } from '../infrastructure/ai/prompts/file-prompt-repository';
import { VsCodeSecretStore } from '../infrastructure/persistence/vscode-secret-store';
import { VsCodeStateStore } from '../infrastructure/persistence/vscode-state-store';
import { VsCodeWorkspaceGateway } from '../infrastructure/workspace/vscode-workspace-gateway';
import { TypeScriptAstParser } from '../infrastructure/parsing/typescript/typescript-ast-parser';
import { AccessibilityProfileCatalog } from '../domain/accessibility/accessibility-profile-catalog';
import { VsCodeUserInterfaceGateway } from '../presentation/accessibility/vscode-user-interface-gateway';
import { VsCodeDiagnosticsGateway } from '../presentation/providers/vscode-diagnostics-gateway';
import { VsCodeEditorGateway } from '../presentation/providers/vscode-editor-gateway';
import { AccessibilityDiagnosticsProvider } from '../presentation/providers/accessibility-diagnostics-provider';
import type { SpeechSynthesizer } from '../application/ports/speech/speech-synthesizer';
import { DesktopSpeechSynthesizer } from '../infrastructure/speech/desktop-speech-synthesizer';
import { DiagnosticChangeNotifier } from '../presentation/accessibility/diagnostic-change-notifier';
import { ProfileEditorController } from '../presentation/accessibility/profile-editor-controller';
import { ProfileSettingsController } from '../presentation/accessibility/profile-settings-controller';
import { CodeSpeakDashboardProvider } from '../presentation/providers/codespeak-dashboard-provider';
import { VoiceCommandCancellation } from '../presentation/voice/voice-command-cancellation';

export interface ServiceContainer {
  readonly accessibilityAnalyzer: AccessibilityAnalyzer;
  readonly accessibilityReports: AccessibilityReportGateway;
  readonly ai: AiProvider;
  readonly configuration: ConfigurationGateway;
  readonly diagnostics: DiagnosticsGateway;
  readonly editor: EditorGateway;
  readonly logger: Logger;
  readonly parser: CodeParser;
  readonly profiles: AccessibilityProfileService;
  readonly secrets: SecretStore;
  readonly speech: SpeechSynthesizer;
  readonly state: StateStore;
  readonly userInterface: UserInterfaceGateway;
  readonly workspace: WorkspaceGateway;
  readonly voiceCancellation: VoiceCommandCancellation;
}

export function createServiceContainer(context: vscode.ExtensionContext): ServiceContainer {
  const outputChannel = vscode.window.createOutputChannel('CodeSpeak AI');
  const logger = new OutputChannelLogger(outputChannel);
  const voiceCancellation = new VoiceCommandCancellation();
  const userInterface = new VsCodeUserInterfaceGateway(voiceCancellation);
  context.subscriptions.push(outputChannel, userInterface);
  const configuration = new VsCodeConfigurationGateway();
  const secrets = new VsCodeSecretStore(context.secrets);
  const prompts = new FilePromptRepository(context.extensionUri);
  const gemini = new GeminiProvider(secrets, configuration, prompts, logger);
  const openAi = new OpenAiProvider(secrets, configuration, prompts, logger);
  const liveAi = new FallbackAiProvider(openAi, gemini, async (primaryError) => {
    logger.warn('OpenAI failed. Switching to the configured Gemini fallback.', {
      errorCode: primaryError.code,
    });
    await userInterface.announce(
      'OpenAI could not complete the request. Trying the configured Gemini fallback.',
      'assertive',
    );
  });
  const ai = liveAi;
  const accessibilityReports = new AccessibilityDiagnosticsProvider();
  const profileCatalog = new AccessibilityProfileCatalog();
  context.subscriptions.push(accessibilityReports);
  context.subscriptions.push(new DiagnosticChangeNotifier(configuration, userInterface));
  context.subscriptions.push(new ProfileEditorController(configuration));
  context.subscriptions.push(
    new ProfileSettingsController(configuration, context.workspaceState, logger),
  );
  const dashboard = new CodeSpeakDashboardProvider(
    new AccessibilityProfileService(configuration, profileCatalog),
  );
  context.subscriptions.push(dashboard);
  context.subscriptions.push(
    vscode.window.registerTreeDataProvider('codespeak.dashboard', dashboard),
  );
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('codespeak')) dashboard.refresh();
    }),
  );

  return {
    accessibilityAnalyzer: new TypeScriptAccessibilityAnalyzer(),
    accessibilityReports,
    ai,
    configuration,
    diagnostics: new VsCodeDiagnosticsGateway(),
    editor: new VsCodeEditorGateway(),
    logger,
    parser: new ParserRegistry([new TypeScriptAstParser()]),
    profiles: new AccessibilityProfileService(configuration, profileCatalog),
    secrets,
    speech: new DesktopSpeechSynthesizer(vscode.env.remoteName === undefined),
    state: new VsCodeStateStore(context.globalState),
    userInterface,
    voiceCancellation,
    workspace: new VsCodeWorkspaceGateway(),
  };
}
