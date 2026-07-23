# ADR 0001: Use the supported VS Code Speech boundary

- Status: Accepted
- Date: 2026-07-18

## Context

VS Code's stable extension API does not expose raw microphone capture. Extension webviews are also not a reliable microphone boundary because their iframe permission policy can deny `getUserMedia`. Bundling a recorder would add platform-specific binaries, signing, update, and privacy obligations.

## Decision

CodeSpeak delegates microphone access and local speech recognition to Microsoft's optional VS Code Speech extension through its documented editor-dictation commands. CodeSpeak reads the resulting transient text, maps it through a typed allowlist, and then executes only CodeSpeak-owned intents.

The transient dictation document is closed after each utterance. Audio is processed locally by VS Code Speech and is not sent to an AI provider. Only a recognized textual instruction reaches OpenAI, or the announced Gemini fallback, when the user confirms an AI-backed command such as code generation.

Speech output uses capability-detected desktop services: System.Speech on Windows, `say` on macOS, and Speech Dispatcher on Linux. Screen-reader announcements remain available independently of speech output.

## Consequences

- Voice input is optional and fails with setup guidance when VS Code Speech is absent.
- The extension remains lightweight and does not ship native audio binaries.
- Microphone permissions and recognition languages are managed by VS Code Speech.
- Remote extension hosts cannot safely provide desktop speech output; CodeSpeak falls back to screen-reader announcements.
- A future recorder or recognizer can implement the existing speech ports without changing voice intents or command execution.
