# CodeSpeak AI extension contracts

This document describes internal TypeScript contracts and public command identifiers for extension contributors. CodeSpeak AI does not currently expose a supported JavaScript API through `Extension.exports`.

## Public command identifiers

| Identifier                             | Arguments                       | Result                                            |
| -------------------------------------- | ------------------------------- | ------------------------------------------------- |
| `codespeak.setApiKey`                  | None                            | Prompts for and securely stores a Gemini key.     |
| `codespeak.clearApiKey`                | None                            | Confirms and removes the key.                     |
| `codespeak.openFile`                   | Optional file query string      | Opens an accessible file picker or matching file. |
| `codespeak.goToLine`                   | Optional string or number       | Reveals a one-based line.                         |
| `codespeak.listDiagnostics`            | None                            | Opens the diagnostics picker.                     |
| `codespeak.generateCode`               | Optional instruction string     | Previews and confirms generated code.             |
| `codespeak.explainSelection`           | None                            | Explains the current selection.                   |
| `codespeak.explainDiagnostic`          | None                            | Explains a selected diagnostic.                   |
| `codespeak.generateDocumentation`      | None                            | Previews and confirms documentation.              |
| `codespeak.selectAccessibilityProfile` | None                            | Selects and persists a profile.                   |
| `codespeak.readCodeStructure`          | Optional `true` to force speech | Previews an AST summary.                          |
| `codespeak.summarizeFile`              | None                            | Summarizes the active file.                       |
| `codespeak.summarizeFolder`            | None                            | Confirms and summarizes the active file's folder. |
| `codespeak.summarizeWorkspace`         | None                            | Confirms and summarizes the workspace.            |
| `codespeak.checkAccessibility`         | None                            | Publishes JSX/TSX findings.                       |
| `codespeak.clearAccessibilityFindings` | None                            | Clears CodeSpeak Problems entries.                |
| `codespeak.voice.toggle`               | None                            | Starts or finishes one voice utterance.           |
| `codespeak.voice.startContinuous`      | None                            | Confirms and starts continuous mode.              |
| `codespeak.voice.stopContinuous`       | None                            | Stops continuous mode.                            |
| `codespeak.speech.speakSelection`      | None                            | Reads selected text aloud.                        |
| `codespeak.speech.stop`                | None                            | Stops desktop speech.                             |
| `codespeak.undo` / `codespeak.redo`    | None                            | Invokes editor history.                           |

Commands invoked programmatically should be treated as asynchronous even when VS Code's command API returns `unknown`.

## Core ports

### `AiProvider`

Accepts an `AiRequest`, an output parser, and optional cancellation signal. Returns a validated `OperationResult<AiResponse<T>>`. Provider adapters must not return unvalidated model output.

### `PromptRepository`

Loads reusable prompt templates by stable prompt ID. Prompts belong in `resources/prompts`; they are not embedded in use cases.

### `CodeParser`

Declares supported language IDs and converts a `WorkspaceDocument` into normalized `CodeStructure`. Parser implementations must use language-aware syntax trees.

### `AccessibilityAnalyzer`

Analyzes a document against an `AccessibilityStandard` and returns deterministic `AccessibilityAuditReport` findings.

### `SpeechSynthesizer`

Reads text using `SpeechSynthesisOptions`, supports cancellation, and returns typed speech failures rather than throwing expected platform errors.

### Platform ports

`EditorGateway`, `WorkspaceGateway`, `DiagnosticsGateway`, `ConfigurationGateway`, `UserInterfaceGateway`, and persistence ports isolate application code from VS Code.

## Error contract

`OperationErrorCode` currently includes configuration, authentication, network, rate-limit, provider, speech, parse, language, editor, workspace, invalid-response, cancellation, and unexpected failures.

Expected adapter failures should return an `OperationError`. Unexpected programming faults can throw and are caught by the command boundary, logged to the CodeSpeak output channel, and presented as a generic accessible error.

## Adding a capability

1. Add or extend domain types without importing VS Code.
2. Define the smallest application port required by the use case.
3. Implement the use case against interfaces.
4. Add the infrastructure or presentation adapter.
5. Wire it in `createServiceContainer` or command registration.
6. Add unit, accessibility-contract, and Extension Host coverage proportional to risk.
7. Update commands, settings, README, API documentation, privacy notes, and changelog.
