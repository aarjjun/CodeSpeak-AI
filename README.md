# CodeSpeak AI

> The AI-powered accessibility assistant for developers.

CodeSpeak AI is an accessibility layer for Visual Studio Code. It reduces the visual, physical, and cognitive effort required to understand code, navigate a workspace, interpret errors, and apply AI-generated changes.

Version `0.2.0` is a preview release. It focuses on accessible code understanding, privacy-bounded project summaries, confirmed AI edits, deterministic accessibility checks, and optional voice interaction.

## Why CodeSpeak AI

Most developer tools assume that every developer can scan dense interfaces, interpret compiler terminology, and visually reconstruct source-code structure. CodeSpeak AI adapts these workflows for blind and low-vision developers, dyslexic and ADHD programmers, older beginners, and students.

It is not an autonomous coding agent and it does not silently edit files. AI output is previewed, announced, and confirmed before it changes source code.

## Current capabilities

- Generate code from a natural-language instruction, then preview and confirm it.
- Explain selected code and diagnostics in plain language.
- Generate docstrings, JSDoc, Javadoc, or Doxygen documentation.
- Summarize the current file, current folder, or workspace in a linear, screen-reader-friendly preview.
- Read JavaScript and TypeScript structure using the TypeScript AST rather than regular expressions.
- Find files, lines, symbols, and diagnostics with keyboard-accessible native controls.
- Check JSX and TSX for missing alternative text, labels, keyboard handlers, focusability, and accessible names.
- Apply accessibility profiles for blind, low-vision, dyslexia, and ADHD workflows.
- Apply reversible visual presets for readable typography, low-vision magnification, and reduced-distraction focus.
- Configure Dyslexia Mode typography, visual simplification, block tracking, simple explanations,
  focused reading, and ambiguous character assistance.
- Accept allowlisted voice commands using local VS Code Speech transcription.
- Resolve spoken input as commands, navigation, Copilot requests, code actions, reading, or explicit dictation in Blind Mode.
- Route live AI requests through OpenAI and speak the response in Blind Mode.
- Fall back to Gemini with an accessible announcement when OpenAI cannot complete a request.
- Read selected text and structural summaries aloud through desktop speech services.

## Requirements

- Visual Studio Code `1.98.0` or newer.
- An OpenAI API key for primary AI commands.
- Optional: a Gemini API key for automatic fallback when OpenAI is unavailable or rate limited.
- Optional: [Microsoft VS Code Speech](https://marketplace.visualstudio.com/items?itemName=ms-vscode.vscode-speech) for voice input.
- Linux speech output additionally requires `spd-say` from Speech Dispatcher. Windows and macOS use built-in operating-system speech services.

## Getting started

1. Install the CodeSpeak AI VSIX or Marketplace extension.
2. Open the Command Palette with `Ctrl+Shift+P` or `Cmd+Shift+P`.
3. Run **CodeSpeak AI: Set OpenAI API Key**. The key is stored in VS Code SecretStorage, not in workspace settings.
4. Optionally run **CodeSpeak AI: Set Gemini API Key** to configure the fallback provider.
5. Run **CodeSpeak AI: Select Accessibility Profile**.
6. Open a source file and try **Read Code Structure**, **Explain Selected Code**, or **Generate Code**.

For voice input, install VS Code Speech and press `Ctrl+Alt+Space` on Windows/Linux or `Cmd+Alt+Space` on macOS. Press the shortcut again to stop listening and process the transcript. The shortcut is configurable through VS Code Keyboard Shortcuts.

Press `Ctrl+Alt+Escape` on Windows/Linux or `Cmd+Alt+Escape` on macOS to discard
active listening or abort the current voice command. The same action is available as
**CodeSpeak AI: Cancel Current Voice Command** and from the voice status bar item while processing.

To test the complete Blind Mode command pipeline without a microphone, run **CodeSpeak AI: Enter Voice Command as Text** and enter the phrase you want to simulate.

## Commands

| Command                                   | Purpose                                                       |
| ----------------------------------------- | ------------------------------------------------------------- |
| Set/Clear Gemini API Key                  | Manage the API key in secure VS Code storage.                 |
| Set/Clear OpenAI API Key                  | Manage the primary key in secure VS Code storage.             |
| Open Workspace File                       | Find and open a workspace file.                               |
| Go to Line                                | Move to a one-based line number.                              |
| Navigate Workspace Diagnostics            | Choose and reveal a problem.                                  |
| Generate Code                             | Preview and optionally insert generated code.                 |
| Explain Selected Code                     | Create a plain-language explanation.                          |
| Explain Diagnostic                        | Explain a selected VS Code diagnostic.                        |
| Generate Documentation for Selection      | Preview and optionally insert documentation.                  |
| Summarize Current File                    | Explain one open file with bounded context.                   |
| Summarize Current Folder                  | Explain up to 12 files below the active file's folder.        |
| Summarize Workspace                       | Explain up to 12 representative workspace files.              |
| Select Accessibility Profile              | Change reading, interaction, and speech behavior.             |
| Show Accessible Controls                  | Choose common actions from a native accessible picker.        |
| Toggle Focus View                         | Enter or leave the reduced-distraction VS Code Zen layout.    |
| Read Code Structure                       | Produce an AST-based structural summary.                      |
| Check Current File Accessibility          | Publish deterministic JSX/TSX findings.                       |
| Clear Accessibility Findings              | Remove CodeSpeak findings from Problems.                      |
| Start or Stop Voice Command               | Capture and process one voice command.                        |
| Cancel Current Voice Command              | Discard listening or abort current voice processing.          |
| Start/Stop Continuous Voice Mode          | Process utterances after a short pause with explicit consent. |
| Toggle Dyslexia Mode                      | Apply or safely restore configurable reading preferences.     |
| Configure Dyslexia Mode and Font          | Change typography and optional visual simplification.         |
| Explain Current Error Simply              | Explain a small diagnostic context in short plain language.   |
| Explain Current Line or Block             | Process code in smaller reading chunks.                       |
| Toggle Dyslexia Focus Mode                | Use the native focused editor layout temporarily.             |
| Read Ambiguous Characters                 | Identify commonly confused characters on request.             |
| Read Selection Aloud / Stop Reading Aloud | Control desktop speech output.                                |
| Undo / Redo                               | Invoke editor history with accessible command names.          |

All commands are available through the keyboard-accessible Command Palette. Voice interaction is optional and every voice capability has a text or keyboard equivalent.

## Settings

| Setting                                           | Default            | Description                                                                                 |
| ------------------------------------------------- | ------------------ | ------------------------------------------------------------------------------------------- |
| `codespeak.model`                                 | `gemini-3.5-flash` | Gemini model used only by the optional fallback provider.                                   |
| `codespeak.openaiModel`                           | `gpt-5.6-sol`      | OpenAI model used for primary AI requests.                                                  |
| `codespeak.voice.language`                        | `en-US`            | BCP 47 language for speech output.                                                          |
| `codespeak.voice.rate`                            | `1`                | Speech rate from `0.5` to `2`.                                                              |
| `codespeak.voice.volume`                          | `100`              | Speech output volume from zero to one hundred.                                              |
| `codespeak.voice.name`                            | empty              | Preferred operating system voice name.                                                      |
| `codespeak.voice.activationMode`                  | `toggle`           | Starts one toggle session or continuous listening.                                          |
| `codespeak.voice.silenceTimeoutSeconds`           | `1.5`              | Processes an utterance after this pause following recognized speech.                        |
| `codespeak.voice.initialSpeechTimeoutSeconds`     | `12`               | Waits this long for the first recognized speech before ending the session.                  |
| `codespeak.voice.continuousListening`             | `false`            | Restarts listening after each recognized continuous utterance.                              |
| `codespeak.voice.confirmBeforeDestructiveActions` | `true`             | Requires confirmation before voice initiated changes.                                       |
| `codespeak.voice.audioCues`                       | `true`             | Enables optional nonverbal voice state cues.                                                |
| `codespeak.blindMode.confirmWorkspaceChanges`     | `true`             | Confirms before a voice request replaces the workspace.                                     |
| `codespeak.privacy.includeSelectionInAiRequests`  | `true`             | Allows selected code in contextual Copilot prompts.                                         |
| `codespeak.privacy.storeVoiceTranscripts`         | `false`            | Reserved privacy control. Transcripts are not stored in this release.                       |
| `codespeak.accessibilityProfile`                  | `custom`           | Active accessibility profile.                                                               |
| `codespeak.focus.minutes`                         | `5`                | Length of an ADHD Mode focus session in minutes.                                            |
| `codespeak.focus.breakMinutes`                    | `5`                | Length of the break countdown after a focus session.                                        |
| `codespeak.autoExplainErrors`                     | `false`            | Announces newly available workspace errors and directs the user to the explanation command. |
| `codespeak.autoReadSummaries`                     | `false`            | Reads generated summaries when speech is enabled.                                           |

Voice recognition language is controlled by the VS Code Speech setting `accessibility.voice.speechLanguage`.

## Privacy and safety

- Gemini and OpenAI API keys are stored through VS Code SecretStorage.
- Voice audio is processed locally by VS Code Speech and is not sent to Gemini or OpenAI by CodeSpeak.
- A confirmed textual instruction is sent to OpenAI first. If OpenAI fails with a provider, quota, authentication, network, or response error and a Gemini key is configured, CodeSpeak announces the switch before sending the same bounded request to Gemini.
- Selected code or diagnostics are sent only for an explicitly invoked AI operation.
- Folder and workspace summaries require confirmation and send at most 12 files and 60,000 characters. Common credentials, private keys, dependencies, build output, hidden files, and version-control data are excluded.
- CodeSpeak does not collect telemetry in this preview release.
- AI output can be incorrect. Review previews before applying changes.

See `SECURITY.md` and `docs/privacy.md` in the project source for the complete model.

See `docs/accessibility-profiles.md` for profile behavior, remaining platform limitations, and a
complete manual test walkthrough.

## Accessibility design

- Native VS Code controls and theme colors.
- Keyboard-only operation.
- Screen-reader status announcements and accessible picker labels.
- No information communicated only through color.
- Visible and announced listening/processing state.
- Confirmation before mutating voice actions.
- Reduced-complexity and grouped-reading profiles.

## Language support

AI explanations can work with any text language supported by the selected Gemini or OpenAI model. Deterministic features currently support:

- Structural reader: JavaScript, JSX, TypeScript, TSX.
- Accessibility checker: JSX and TSX.
- Documentation styles: Python, JavaScript, TypeScript, Java, C, C++.

## Offline behavior

Navigation, structural parsing, accessibility checking, profiles, and desktop speech do not require an external provider. AI generation and explanation commands use OpenAI first, automatically try Gemini after eligible OpenAI failures, and report a recoverable error when neither provider can complete the request.

## Development

```sh
npm ci
npm run verify
npm run test:integration
npm run package
```

The integration suite downloads and launches the minimum supported VS Code version in an isolated Extension Host.

Architecture documentation is available in `docs/architecture.md`. Public extension contracts are described in `docs/api.md`.
Blind Mode commands, privacy boundaries, and limitations are described in `docs/blind-mode.md`.

## Roadmap

- Dedicated accessible AI chat.
- Learning assistant with exercises and answer checking.
- More parser languages and accessibility rule packs.
- Additional speech engines behind the existing speech ports.

## Support

Read `SUPPORT.md` before reporting a problem. Never include API keys, private source code, or voice transcripts in a support request.

## License

Copyright © 2026 CodeSpeak AI. All rights reserved. See `LICENSE.txt`.
