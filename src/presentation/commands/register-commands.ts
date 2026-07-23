import * as vscode from 'vscode';
import type { ServiceContainer } from '../../bootstrap/service-container';
import { ManageApiKey } from '../../application/use-cases/ai/manage-api-key';
import { CheckActiveDocumentAccessibility } from '../../application/use-cases/accessibility/check-active-document-accessibility';
import { SelectAccessibilityProfile } from '../../application/use-cases/accessibility/select-accessibility-profile';
import { ReadCodeStructure } from '../../application/use-cases/code-intelligence/read-code-structure';
import { StructuralSummaryFormatter } from '../../application/services/structural-summary-formatter';
import { AccessibilityProfileCatalog } from '../../domain/accessibility/accessibility-profile-catalog';
import { ExplainDiagnostic } from '../../application/use-cases/ai/explain-diagnostic';
import { ExplainSelection } from '../../application/use-cases/ai/explain-selection';
import { GenerateCode } from '../../application/use-cases/ai/generate-code';
import { GenerateDocumentation } from '../../application/use-cases/ai/generate-documentation';
import { GenerateCodeSummary } from '../../application/use-cases/ai/generate-code-summary';
import { AssistLearning } from '../../application/use-cases/ai/assist-learning';
import { NavigateDiagnostics } from '../../application/use-cases/diagnostics/navigate-diagnostics';
import { EditorHistory } from '../../application/use-cases/workspace/editor-history';
import { GoToLine } from '../../application/use-cases/workspace/go-to-line';
import { OpenFile } from '../../application/use-cases/workspace/open-file';
import { CommandIds } from './command-ids';
import {
  codeExplanationParser,
  diagnosticExplanationParser,
  documentationGenerationParser,
  codeSummaryParser,
  generatedCodeParser,
  learningAssistanceParser,
} from '../../infrastructure/ai/validation/ai-output-parsers';
import { VoiceIntentParser } from '../../application/services/voice-intent-parser';
import { VoiceIntentResolver } from '../../application/services/voice-intent-resolver';
import { VoiceIntentExecutor } from '../voice/voice-intent-executor';
import { VsCodeDictationController } from '../voice/vscode-dictation-controller';
import { SpeakSelection } from '../../application/use-cases/speech/speak-selection';
import { FocusTimerController } from '../accessibility/focus-timer-controller';
import { AccessibleSpeechService } from '../../application/services/accessible-speech-service';
import { BlindContextReader } from '../accessibility/blind-context-reader';
import { CopilotChatIntegration } from '../integrations/copilot-chat-integration';
import { VoiceFolderController } from '../accessibility/voice-folder-controller';
import { AudioCueService } from '../../infrastructure/speech/audio-cue-service';
import { VoiceCommandHelp } from '../accessibility/voice-command-help';

type CommandCallback = (...args: readonly unknown[]) => Promise<void>;

export function registerCommands(
  context: vscode.ExtensionContext,
  services: ServiceContainer,
): void {
  const apiKey = new ManageApiKey(services.secrets);
  const diagnostics = new NavigateDiagnostics(
    services.diagnostics,
    services.editor,
    services.userInterface,
  );
  const history = new EditorHistory(services.editor);
  const goToLine = new GoToLine(services.editor, services.userInterface);
  const openFile = new OpenFile(services.workspace, services.editor, services.userInterface);
  const accessibleSpeech = new AccessibleSpeechService(
    services.speech,
    services.profiles,
    services.configuration,
    services.userInterface,
  );
  const generateCode = new GenerateCode(
    services.ai,
    generatedCodeParser,
    services.editor,
    services.userInterface,
    accessibleSpeech,
  );
  const explainSelection = new ExplainSelection(
    services.ai,
    codeExplanationParser,
    services.editor,
    services.userInterface,
    accessibleSpeech,
  );
  const explainDiagnostic = new ExplainDiagnostic(
    services.ai,
    diagnosticExplanationParser,
    services.diagnostics,
    services.editor,
    services.userInterface,
    accessibleSpeech,
  );
  const generateDocumentation = new GenerateDocumentation(
    services.ai,
    documentationGenerationParser,
    services.editor,
    services.userInterface,
    accessibleSpeech,
  );
  const generateCodeSummary = new GenerateCodeSummary(
    services.ai,
    codeSummaryParser,
    services.editor,
    services.workspace,
    services.userInterface,
    services.profiles,
    services.speech,
    accessibleSpeech,
  );
  const assistLearning = new AssistLearning(
    services.ai,
    learningAssistanceParser,
    services.editor,
    services.userInterface,
    accessibleSpeech,
  );
  const selectAccessibilityProfile = new SelectAccessibilityProfile(
    new AccessibilityProfileCatalog(),
    services.configuration,
    services.userInterface,
  );
  const readCodeStructure = new ReadCodeStructure(
    services.parser,
    services.profiles,
    new StructuralSummaryFormatter(),
    services.editor,
    services.userInterface,
    services.speech,
  );
  const checkAccessibility = new CheckActiveDocumentAccessibility(
    services.accessibilityAnalyzer,
    services.accessibilityReports,
    services.editor,
    services.userInterface,
  );
  const blindReader = new BlindContextReader(accessibleSpeech);
  const copilot = new CopilotChatIntegration(accessibleSpeech);
  const folders = new VoiceFolderController(accessibleSpeech, services.userInterface);
  const audioCues = new AudioCueService();
  const voiceHelp = new VoiceCommandHelp(accessibleSpeech);
  const voiceResolver = new VoiceIntentResolver(new VoiceIntentParser(), services.ai);
  const voiceExecutor = new VoiceIntentExecutor(
    blindReader,
    copilot,
    folders,
    accessibleSpeech,
    audioCues,
  );
  const voice = new VsCodeDictationController(
    voiceResolver,
    voiceExecutor,
    services.userInterface,
    services.logger,
    audioCues,
    accessibleSpeech,
  );
  const speakSelection = new SpeakSelection(
    services.speech,
    services.profiles,
    services.editor,
    services.userInterface,
  );
  const focusTimer = new FocusTimerController(services.userInterface);
  context.subscriptions.push(voice);
  context.subscriptions.push(focusTimer);

  const commands: ReadonlyArray<readonly [string, CommandCallback]> = [
    [
      CommandIds.toggleDemoMode,
      async () => {
        const configuration = vscode.workspace.getConfiguration('codespeak');
        const enabled = !configuration.get<boolean>('ai.demoMode', false);
        await configuration.update('ai.demoMode', enabled, vscode.ConfigurationTarget.Workspace);
        await accessibleSpeech.speak(
          enabled
            ? 'Local demo AI enabled. CodeSpeak will not contact Gemini.'
            : 'Local demo AI disabled. CodeSpeak will use the configured Gemini service.',
        );
      },
    ],
    [
      CommandIds.setApiKey,
      async () => {
        const value = await services.userInterface.requestText('Set Gemini API key', {
          password: true,
          placeHolder: 'Paste your Gemini API key',
        });
        if (value === undefined) {
          return;
        }
        const result = await apiKey.save(value);
        if (!result.ok) {
          await services.userInterface.showWarning(result.error.message);
          return;
        }
        await services.userInterface.showInformation('Gemini API key saved securely.');
      },
    ],
    [
      CommandIds.clearApiKey,
      async () => {
        const confirmed = await services.userInterface.confirm('Remove the saved Gemini API key?');
        if (!confirmed) {
          return;
        }
        await apiKey.clear();
        await services.userInterface.showInformation('Gemini API key removed.');
      },
    ],
    [CommandIds.openFile, async (query) => openFile.execute(asOptionalString(query))],
    [CommandIds.openFolder, async (name) => folders.open(asOptionalString(name))],
    [CommandIds.openRecentFolder, async () => folders.openRecent()],
    [CommandIds.goToLine, async (line) => goToLine.execute(asOptionalLine(line))],
    [CommandIds.listDiagnostics, async () => diagnostics.execute()],
    [
      CommandIds.nextDiagnostic,
      async () => {
        await vscode.commands.executeCommand('editor.action.marker.nextInFiles');
      },
    ],
    [
      CommandIds.previousDiagnostic,
      async () => {
        await vscode.commands.executeCommand('editor.action.marker.prevInFiles');
      },
    ],
    [
      CommandIds.generateCode,
      async (instruction, confirmationAlreadyGranted) =>
        generateCode.execute(asOptionalString(instruction), confirmationAlreadyGranted === true),
    ],
    [CommandIds.explainSelection, async () => explainSelection.execute()],
    [
      CommandIds.explainCurrentFunction,
      async () => {
        if (await blindReader.selectCurrentSymbol()) await explainSelection.execute();
      },
    ],
    [CommandIds.askCopilot, async (prompt) => copilot.send(asOptionalString(prompt) ?? '')],
    [
      CommandIds.askLearningQuestion,
      async (question) => assistLearning.execute(asOptionalString(question)),
    ],
    [CommandIds.explainDiagnostic, async () => explainDiagnostic.execute()],
    [
      CommandIds.generateDocumentation,
      async (confirmationAlreadyGranted) =>
        generateDocumentation.execute(confirmationAlreadyGranted === true),
    ],
    [CommandIds.summarizeFile, async () => generateCodeSummary.execute('file')],
    [CommandIds.summarizeFolder, async () => generateCodeSummary.execute('folder')],
    [CommandIds.summarizeWorkspace, async () => generateCodeSummary.execute('workspace')],
    [CommandIds.selectAccessibilityProfile, async () => selectAccessibilityProfile.execute()],
    [
      CommandIds.readCodeStructure,
      async (readAloud) => readCodeStructure.execute(readAloud === true),
    ],
    [CommandIds.checkAccessibility, async () => checkAccessibility.execute()],
    [CommandIds.readSelectionContext, async () => blindReader.readSelection()],
    [CommandIds.readSelectionDiagnostics, async () => blindReader.readSelectionDiagnostics()],
    [CommandIds.readCurrentLine, async () => blindReader.readRelativeLine(0)],
    [CommandIds.readCurrentDiagnostic, async () => blindReader.readCurrentDiagnostic()],
    [CommandIds.readAllDiagnostics, async () => blindReader.readAllDiagnostics()],
    [CommandIds.readNextDiagnostic, async () => blindReader.readNextDiagnostic()],
    [CommandIds.readNextLine, async () => blindReader.readRelativeLine(1)],
    [CommandIds.readPreviousLine, async () => blindReader.readRelativeLine(-1)],
    [CommandIds.whereAmI, async () => blindReader.whereAmI()],
    [CommandIds.listVoiceCommands, async () => voiceHelp.list(true)],
    [CommandIds.nextVoiceCommands, async () => voiceHelp.list(false)],
    [
      CommandIds.clearAccessibilityFindings,
      async () => {
        services.accessibilityReports.clear();
        await services.userInterface.announce('Accessibility findings cleared.');
      },
    ],
    [CommandIds.undo, async () => history.execute('undo')],
    [CommandIds.redo, async () => history.execute('redo')],
    [CommandIds.voiceToggle, async () => voice.toggle()],
    [CommandIds.voiceStartContinuous, async () => voice.startContinuous()],
    [CommandIds.voiceStopContinuous, async () => voice.stopContinuous()],
    [
      CommandIds.voiceSimulate,
      async () => {
        const transcript = await services.userInterface.requestText(
          'Enter a Blind Mode voice command',
          {
            placeHolder: 'For example: where am I, read line 6, or type hello world',
          },
        );
        if (transcript === undefined || transcript.trim().length === 0) return;
        const normalizedTranscript = transcript.trim();
        await services.userInterface.announce(`Testing voice command: ${normalizedTranscript}`);
        await voiceExecutor.execute(
          await voiceResolver.resolve(normalizedTranscript),
          normalizedTranscript,
        );
      },
    ],
    [CommandIds.speakSelection, async () => speakSelection.execute()],
    [CommandIds.stopSpeaking, async () => accessibleSpeech.stop()],
    [CommandIds.pauseSpeech, async () => accessibleSpeech.pause()],
    [CommandIds.resumeSpeech, async () => accessibleSpeech.resume()],
    [CommandIds.repeatSpeech, async () => accessibleSpeech.repeat()],
    [CommandIds.slowerSpeech, async () => accessibleSpeech.adjustRate('slower')],
    [CommandIds.fasterSpeech, async () => accessibleSpeech.adjustRate('faster')],
    [CommandIds.startFocusTimer, async () => focusTimer.start()],
    [CommandIds.pauseFocusTimer, async () => focusTimer.pause()],
    [CommandIds.resetFocusTimer, async () => focusTimer.reset()],
  ];

  for (const [id, callback] of commands) {
    context.subscriptions.push(
      vscode.commands.registerCommand(id, (...args: readonly unknown[]) =>
        executeSafely(id, callback, args, services),
      ),
    );
  }
}

async function executeSafely(
  commandId: string,
  callback: CommandCallback,
  args: readonly unknown[],
  services: ServiceContainer,
): Promise<void> {
  try {
    await callback(...args);
  } catch (error: unknown) {
    services.logger.error('Command execution failed.', error, { commandId });
    await services.userInterface.showError(
      'CodeSpeak could not complete that command. Technical details are available in the CodeSpeak AI output channel.',
    );
  }
}

function asOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function asOptionalLine(value: unknown): string | number | undefined {
  return typeof value === 'string' || typeof value === 'number' ? value : undefined;
}
