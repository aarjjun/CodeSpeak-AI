# CodeSpeak AI

> The AI-powered accessibility assistant for developers.

CodeSpeak AI is an accessibility layer for Visual Studio Code. It reduces the visual, physical, and cognitive effort required to understand code, navigate a workspace, interpret errors, and apply AI-generated changes.

Version `0.2.0` is a preview release. It focuses on accessible code understanding, privacy-bounded project summaries, confirmed AI edits, deterministic accessibility checks, and optional voice interaction.

## Why CodeSpeak AI

Most developer tools assume that every developer can scan dense interfaces, operate a keyboard comfortably, interpret compiler terminology, and visually reconstruct source-code structure. CodeSpeak AI adapts these workflows for blind and low-vision developers, motor-impaired developers, dyslexic and ADHD programmers, older beginners, and students.

It is not an autonomous coding agent and it does not silently edit files. AI output is previewed, announced, and confirmed before it changes source code.

## Current capabilities

- Generate code from a natural-language instruction, then preview and confirm it.
- Explain selected code and diagnostics in plain language.
- Generate docstrings, JSDoc, Javadoc, or Doxygen documentation.
- Summarize the current file, current folder, or workspace in a linear, screen-reader-friendly preview.
- Read JavaScript and TypeScript structure using the TypeScript AST rather than regular expressions.
- Find files, lines, symbols, and diagnostics with keyboard-accessible native controls.
- Check JSX and TSX for missing alternative text, labels, keyboard handlers, focusability, and accessible names.
- Apply accessibility profiles for blind, low-vision, dyslexia, motor-accessibility, and ADHD workflows.
- Accept allowlisted voice commands using local VS Code Speech transcription.
- Read selected text and structural summaries aloud through desktop speech services.

## Requirements

- Visual Studio Code `1.98.0` or newer.
- A Gemini API key for AI-backed commands.
- Optional: [Microsoft VS Code Speech](https://marketplace.visualstudio.com/items?itemName=ms-vscode.vscode-speech) for voice input.
- Linux speech output additionally requires `spd-say` from Speech Dispatcher. Windows and macOS use built-in operating-system speech services.

## Getting started

1. Install the CodeSpeak AI VSIX or Marketplace extension.
2. Open the Command Palette with `Ctrl+Shift+P` or `Cmd+Shift+P`.
3. Run **CodeSpeak AI: Set Gemini API Key**. The key is stored in VS Code SecretStorage, not in workspace settings.
4. Run **CodeSpeak AI: Select Accessibility Profile**.
5. Open a source file and try **Read Code Structure**, **Explain Selected Code**, or **Generate Code**.

For voice input, install VS Code Speech and press `Ctrl+Alt+V` on Windows/Linux or `Cmd+Alt+V` on macOS. Press the shortcut again to stop listening and process the transcript.

## Commands

| Command                                   | Purpose                                                       |
| ----------------------------------------- | ------------------------------------------------------------- |
| Set/Clear Gemini API Key                  | Manage the API key in secure VS Code storage.                 |
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
| Read Code Structure                       | Produce an AST-based structural summary.                      |
| Check Current File Accessibility          | Publish deterministic JSX/TSX findings.                       |
| Clear Accessibility Findings              | Remove CodeSpeak findings from Problems.                      |
| Start or Stop Voice Command               | Capture and process one voice command.                        |
| Start/Stop Continuous Voice Mode          | Process utterances after a short pause with explicit consent. |
| Read Selection Aloud / Stop Reading Aloud | Control desktop speech output.                                |
| Undo / Redo                               | Invoke editor history with accessible command names.          |

All commands are available through the keyboard-accessible Command Palette. Voice interaction is optional and every voice capability has a text or keyboard equivalent.

## Settings

| Setting                          | Default            | Description                                                                                 |
| -------------------------------- | ------------------ | ------------------------------------------------------------------------------------------- |
| `codespeak.model`                | `gemini-3.5-flash` | Gemini model used for AI operations.                                                        |
| `codespeak.voice.language`       | `en-US`            | BCP 47 language for speech output.                                                          |
| `codespeak.voice.rate`           | `1`                | Speech rate from `0.5` to `2`.                                                              |
| `codespeak.accessibilityProfile` | `custom`           | Active accessibility profile.                                                               |
| `codespeak.autoExplainErrors`    | `false`            | Announces newly available workspace errors and directs the user to the explanation command. |
| `codespeak.autoReadSummaries`    | `false`            | Reads generated summaries when speech is enabled.                                           |

Voice recognition language is controlled by the VS Code Speech setting `accessibility.voice.speechLanguage`.

## Privacy and safety

- API keys are stored through VS Code SecretStorage.
- Voice audio is processed locally by VS Code Speech and is not sent to Gemini by CodeSpeak.
- A confirmed textual instruction may be sent to Gemini when an AI-backed voice command is used.
- Selected code or diagnostics are sent only for an explicitly invoked AI operation.
- Folder and workspace summaries require confirmation and send at most 12 files and 60,000 characters. Common credentials, private keys, dependencies, build output, hidden files, and version-control data are excluded.
- CodeSpeak does not collect telemetry in this preview release.
- AI output can be incorrect. Review previews before applying changes.

See `SECURITY.md` and `docs/privacy.md` in the project source for the complete model.

## Accessibility design

- Native VS Code controls and theme colors.
- Keyboard-only operation.
- Screen-reader status announcements and accessible picker labels.
- No information communicated only through color.
- Visible and announced listening/processing state.
- Confirmation before mutating voice actions.
- Reduced-complexity and grouped-reading profiles.

## Language support

AI explanations can work with any text language supported by the selected Gemini model. Deterministic features currently support:

- Structural reader: JavaScript, JSX, TypeScript, TSX.
- Accessibility checker: JSX and TSX.
- Documentation styles: Python, JavaScript, TypeScript, Java, C, C++.

## Offline behavior

Navigation, structural parsing, accessibility checking, profiles, and desktop speech do not require Gemini. AI generation and explanation commands report a recoverable error when offline, rate-limited, or missing an API key.

## Development

```sh
npm ci
npm run verify
npm run test:integration
npm run package
```

The integration suite downloads and launches the minimum supported VS Code version in an isolated Extension Host.

Architecture documentation is available in `docs/architecture.md`. Public extension contracts are described in `docs/api.md`.

## Roadmap

- Dedicated accessible AI chat.
- Learning assistant with exercises and answer checking.
- More parser languages and accessibility rule packs.
- Additional speech engines behind the existing speech ports.

## Support

Read `SUPPORT.md` before reporting a problem. Never include API keys, private source code, or voice transcripts in a support request.

## License

Copyright © 2026 CodeSpeak AI. All rights reserved. See `LICENSE.txt`.
