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
} from '../../infrastructure/ai/validation/ai-output-parsers';
import { VoiceIntentParser } from '../../application/services/voice-intent-parser';
import { VoiceIntentExecutor } from '../voice/voice-intent-executor';
import { VsCodeDictationController } from '../voice/vscode-dictation-controller';
import { SpeakSelection } from '../../application/use-cases/speech/speak-selection';

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
  const generateCode = new GenerateCode(
    services.ai,
    generatedCodeParser,
    services.editor,
    services.userInterface,
  );
  const explainSelection = new ExplainSelection(
    services.ai,
    codeExplanationParser,
    services.editor,
    services.userInterface,
  );
  const explainDiagnostic = new ExplainDiagnostic(
    services.ai,
    diagnosticExplanationParser,
    services.diagnostics,
    services.editor,
    services.userInterface,
  );
  const generateDocumentation = new GenerateDocumentation(
    services.ai,
    documentationGenerationParser,
    services.editor,
    services.userInterface,
  );
  const generateCodeSummary = new GenerateCodeSummary(
    services.ai,
    codeSummaryParser,
    services.editor,
    services.workspace,
    services.userInterface,
    services.profiles,
    services.speech,
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
  const voice = new VsCodeDictationController(
    new VoiceIntentParser(),
    new VoiceIntentExecutor(services.userInterface),
    services.userInterface,
    services.logger,
  );
  const speakSelection = new SpeakSelection(
    services.speech,
    services.profiles,
    services.editor,
    services.userInterface,
  );
  context.subscriptions.push(voice);

  const commands: ReadonlyArray<readonly [string, CommandCallback]> = [
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
    [CommandIds.goToLine, async (line) => goToLine.execute(asOptionalLine(line))],
    [CommandIds.listDiagnostics, async () => diagnostics.execute()],
    [
      CommandIds.generateCode,
      async (instruction) => generateCode.execute(asOptionalString(instruction)),
    ],
    [CommandIds.explainSelection, async () => explainSelection.execute()],
    [CommandIds.explainDiagnostic, async () => explainDiagnostic.execute()],
    [CommandIds.generateDocumentation, async () => generateDocumentation.execute()],
    [CommandIds.summarizeFile, async () => generateCodeSummary.execute('file')],
    [CommandIds.summarizeFolder, async () => generateCodeSummary.execute('folder')],
    [CommandIds.summarizeWorkspace, async () => generateCodeSummary.execute('workspace')],
    [CommandIds.selectAccessibilityProfile, async () => selectAccessibilityProfile.execute()],
    [
      CommandIds.readCodeStructure,
      async (readAloud) => readCodeStructure.execute(readAloud === true),
    ],
    [CommandIds.checkAccessibility, async () => checkAccessibility.execute()],
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
    [CommandIds.speakSelection, async () => speakSelection.execute()],
    [CommandIds.stopSpeaking, async () => services.speech.stop()],
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
