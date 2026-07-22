import * as vscode from 'vscode';
import type { Logger } from '../../application/ports/platform/logger';
import type { UserInterfaceGateway } from '../../application/ports/platform/user-interface-gateway';
import type { VoiceIntentResolver } from '../../application/services/voice-intent-resolver';
import type { VoiceIntentExecutor } from './voice-intent-executor';
import type { AudioCueService } from '../../infrastructure/speech/audio-cue-service';
import type { AccessibleSpeechService } from '../../application/services/accessible-speech-service';

const SPEECH_EXTENSION_ID = 'ms-vscode.vscode-speech';
const START_DICTATION_COMMAND = 'workbench.action.editorDictation.start';
const STOP_DICTATION_COMMAND = 'workbench.action.editorDictation.stop';
const DEFAULT_SILENCE_TIMEOUT_SECONDS = 3;

type VoiceState = 'idle' | 'listening' | 'processing';

interface PreviousEditorState {
  readonly document: vscode.TextDocument;
  readonly selection: vscode.Selection;
  readonly viewColumn?: vscode.ViewColumn;
}

export class VsCodeDictationController implements vscode.Disposable {
  private readonly statusBarItem: vscode.StatusBarItem;
  private state: VoiceState = 'idle';
  private continuous = false;
  private voiceDocument: vscode.TextDocument | undefined;
  private previousEditor: PreviousEditorState | undefined;
  private pauseTimer: NodeJS.Timeout | undefined;
  private documentChangeSubscription: vscode.Disposable | undefined;

  public constructor(
    private readonly resolver: VoiceIntentResolver,
    private readonly executor: VoiceIntentExecutor,
    private readonly userInterface: UserInterfaceGateway,
    private readonly logger: Logger,
    private readonly audioCues: AudioCueService,
    private readonly speech: AccessibleSpeechService,
  ) {
    this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 99);
    this.statusBarItem.name = 'CodeSpeak AI voice status';
    this.statusBarItem.command = 'codespeak.voice.toggle';
    this.renderStatus();
  }

  public async toggle(): Promise<void> {
    if (this.state === 'idle') {
      const settings = vscode.workspace.getConfiguration('codespeak');
      this.continuous =
        settings.get<boolean>('voice.continuousListening', false) ||
        settings.get<string>('voice.activationMode', 'toggle') === 'continuous';
      await this.start();
      return;
    }
    if (this.state === 'listening') {
      await this.finishUtterance(true);
    }
  }

  public async startContinuous(): Promise<void> {
    if (this.continuous || this.state !== 'idle') {
      await this.speech.speak('A CodeSpeak voice session is already active.', 'critical');
      return;
    }
    const confirmed = await this.userInterface.confirm(
      'Start continuous voice mode? The microphone remains active until you run “Stop Continuous Voice Mode”. Commands are processed after a short pause.',
    );
    if (!confirmed) {
      return;
    }
    this.continuous = true;
    await this.start();
  }

  public async stopContinuous(): Promise<void> {
    if (!this.continuous) {
      await this.speech.speak('Continuous voice mode is not active.');
      return;
    }
    this.continuous = false;
    await this.cancelCurrentSession('Continuous voice mode stopped.');
  }

  private async start(): Promise<void> {
    if (!(await this.ensureSpeechExtension())) {
      this.continuous = false;
      return;
    }

    const editor = vscode.window.activeTextEditor;
    if (editor !== undefined) {
      this.previousEditor = {
        document: editor.document,
        selection: editor.selection,
        ...(editor.viewColumn === undefined ? {} : { viewColumn: editor.viewColumn }),
      };
    }

    const uri = vscode.Uri.parse(`untitled:CodeSpeak Voice Command ${String(Date.now())}.txt`);
    this.voiceDocument = await vscode.workspace.openTextDocument(uri);
    await vscode.languages.setTextDocumentLanguage(this.voiceDocument, 'plaintext');
    await vscode.window.showTextDocument(this.voiceDocument, {
      preview: true,
      preserveFocus: false,
    });

    this.documentChangeSubscription?.dispose();
    this.documentChangeSubscription = vscode.workspace.onDidChangeTextDocument((event) => {
      if (event.document.uri.toString() !== this.voiceDocument?.uri.toString()) {
        return;
      }
      this.scheduleSilenceProcessing();
    });

    this.state = 'listening';
    await vscode.commands.executeCommand('setContext', 'codespeak.voiceListening', true);
    this.renderStatus();
    this.audioCues.play('listening-started');
    await this.userInterface.announce(
      this.continuous
        ? 'Continuous voice mode listening. Speak a command, then pause.'
        : 'Voice mode active. Speak a command or begin with type to dictate.',
    );

    try {
      await vscode.commands.executeCommand(START_DICTATION_COMMAND);
      this.scheduleSilenceProcessing();
    } catch (error: unknown) {
      this.logger.error('VS Code Speech failed to start dictation.', error);
      this.continuous = false;
      await this.cancelCurrentSession('Voice input could not start.');
      await this.speech.speak(
        'Voice input could not start. Check microphone permission and the selected speech language.',
        'critical',
      );
      await this.userInterface.showError(
        'VS Code Speech could not start. Check microphone permission and the selected speech language.',
      );
    }
  }

  private scheduleSilenceProcessing(): void {
    if (this.state !== 'listening') {
      return;
    }
    if (this.pauseTimer !== undefined) {
      clearTimeout(this.pauseTimer);
    }
    const seconds = vscode.workspace
      .getConfiguration('codespeak')
      .get<number>('voice.silenceTimeoutSeconds', DEFAULT_SILENCE_TIMEOUT_SECONDS);
    this.pauseTimer = setTimeout(
      () => {
        void this.finishUtterance(true);
      },
      Math.max(2, Math.min(60, seconds)) * 1_000,
    );
  }

  private async finishUtterance(execute: boolean): Promise<void> {
    if (this.state !== 'listening') {
      return;
    }
    this.state = 'processing';
    this.clearPauseTimer();
    await vscode.commands.executeCommand('setContext', 'codespeak.voiceListening', false);
    await vscode.commands.executeCommand('setContext', 'codespeak.voiceProcessing', true);
    this.renderStatus();

    try {
      await vscode.commands.executeCommand(STOP_DICTATION_COMMAND);
    } catch (error: unknown) {
      this.logger.warn('VS Code Speech stop command was unavailable.', { error: String(error) });
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 150));

    const transcript = this.voiceDocument?.getText().trim() ?? '';
    await this.closeVoiceDocument();
    await this.restorePreviousEditor();

    if (execute && transcript.length > 0) {
      this.audioCues.play('recognized');
      await this.userInterface.announce(`Recognized: ${transcript}`);
      await this.executor.execute(await this.resolver.resolve(transcript), transcript);
      this.audioCues.play('completed');
    } else if (execute) {
      this.audioCues.play('failed');
      await this.speech.speak(
        'No speech was recognized. Check the microphone and try again.',
        'critical',
      );
      await this.userInterface.showWarning('No speech was recognized.');
    }

    const restart = this.continuous;
    this.state = 'idle';
    await vscode.commands.executeCommand('setContext', 'codespeak.voiceListening', false);
    await vscode.commands.executeCommand('setContext', 'codespeak.voiceProcessing', false);
    this.renderStatus();
    if (restart) {
      await this.start();
    } else {
      this.audioCues.play('listening-stopped');
      await this.speech.speak('Voice mode stopped.');
    }
  }

  private async cancelCurrentSession(message: string): Promise<void> {
    this.clearPauseTimer();
    if (this.state === 'listening') {
      try {
        await vscode.commands.executeCommand(STOP_DICTATION_COMMAND);
      } catch (error: unknown) {
        this.logger.warn('VS Code Speech stop command was unavailable.', { error: String(error) });
      }
    }
    await this.closeVoiceDocument();
    await this.restorePreviousEditor();
    this.state = 'idle';
    await vscode.commands.executeCommand('setContext', 'codespeak.voiceListening', false);
    await vscode.commands.executeCommand('setContext', 'codespeak.voiceProcessing', false);
    this.renderStatus();
    this.audioCues.play('listening-stopped');
    await this.speech.speak(message);
  }

  private async closeVoiceDocument(): Promise<void> {
    this.documentChangeSubscription?.dispose();
    this.documentChangeSubscription = undefined;
    const document = this.voiceDocument;
    this.voiceDocument = undefined;
    if (
      document !== undefined &&
      vscode.window.activeTextEditor?.document.uri.toString() === document.uri.toString()
    ) {
      await vscode.commands.executeCommand('workbench.action.revertAndCloseActiveEditor');
    }
  }

  private async restorePreviousEditor(): Promise<void> {
    const previous = this.previousEditor;
    if (previous === undefined || previous.document.isClosed) {
      return;
    }
    const editor = await vscode.window.showTextDocument(previous.document, {
      ...(previous.viewColumn === undefined ? {} : { viewColumn: previous.viewColumn }),
      preserveFocus: false,
      preview: false,
    });
    editor.selection = previous.selection;
    editor.revealRange(previous.selection, vscode.TextEditorRevealType.InCenterIfOutsideViewport);
  }

  private async ensureSpeechExtension(): Promise<boolean> {
    if (vscode.extensions.getExtension(SPEECH_EXTENSION_ID) !== undefined) {
      return true;
    }
    const action = await vscode.window.showWarningMessage(
      'CodeSpeak voice input uses the Microsoft VS Code Speech extension for private, local transcription.',
      'Show VS Code Speech',
    );
    if (action === 'Show VS Code Speech') {
      await vscode.commands.executeCommand(
        'workbench.extensions.search',
        `@id:${SPEECH_EXTENSION_ID}`,
      );
    }
    return false;
  }

  private clearPauseTimer(): void {
    if (this.pauseTimer !== undefined) {
      clearTimeout(this.pauseTimer);
      this.pauseTimer = undefined;
    }
  }

  private renderStatus(): void {
    if (this.state === 'listening') {
      this.statusBarItem.text = '$(mic-filled) CodeSpeak listening';
      this.statusBarItem.tooltip = this.continuous
        ? 'Continuous voice mode is active. Run Stop Continuous Voice Mode to stop.'
        : 'Activate to stop listening and execute the command.';
      this.statusBarItem.accessibilityInformation = {
        label: `CodeSpeak is listening${this.continuous ? ' in continuous mode' : ''}.`,
        role: 'button',
      };
      this.statusBarItem.show();
      return;
    }
    if (this.state === 'processing') {
      this.statusBarItem.text = '$(loading~spin) CodeSpeak processing voice';
      this.statusBarItem.accessibilityInformation = {
        label: 'CodeSpeak is processing the voice command.',
        role: 'status',
      };
      this.statusBarItem.show();
      return;
    }
    this.statusBarItem.hide();
  }

  public dispose(): void {
    this.clearPauseTimer();
    this.documentChangeSubscription?.dispose();
    this.statusBarItem.dispose();
  }
}
