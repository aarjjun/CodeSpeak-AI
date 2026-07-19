export type ListeningMode = 'push-to-talk' | 'continuous';

export interface AudioChunk {
  readonly data: Uint8Array;
  readonly mimeType: string;
  readonly sequence: number;
}

export interface SpeechRecognitionOptions {
  readonly language: string;
  readonly interimResults: boolean;
}

export interface SpeechTranscript {
  readonly text: string;
  readonly confidence?: number;
  readonly final: boolean;
}

export type VoiceIntentName =
  | 'codespeak-command'
  | 'create-code'
  | 'modify-code'
  | 'rename-symbol'
  | 'quick-fix'
  | 'copilot-chat'
  | 'dictation'
  | 'open-file'
  | 'open-folder'
  | 'go-to-line'
  | 'read-line'
  | 'read-line-range'
  | 'read-current-function'
  | 'find-symbol'
  | 'explain-selection'
  | 'explain-diagnostic'
  | 'summarize-file'
  | 'check-accessibility'
  | 'start-focus-timer'
  | 'speech-control'
  | 'confirm'
  | 'cancel'
  | 'undo'
  | 'redo'
  | 'unknown';

export interface VoiceIntent {
  readonly name: VoiceIntentName;
  readonly parameters: Readonly<Record<string, string | number | boolean>>;
  readonly confidence?: number;
  readonly requiresConfirmation: boolean;
}

export interface SpeechSynthesisOptions {
  readonly language: string;
  readonly rate: number;
  readonly volume?: number;
  readonly voiceName?: string;
}
