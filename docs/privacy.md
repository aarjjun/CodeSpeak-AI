# Privacy model

CodeSpeak AI follows a minimal-context, explicit-action model.

## Data processed locally

- Editor selections and active-document content needed by deterministic parsers.
- VS Code diagnostics.
- Accessibility profile and configuration values.
- Voice transcripts produced by Microsoft VS Code Speech.
- Structural and JSX/TSX accessibility analysis.

Voice audio is handled by VS Code Speech and is not read or transmitted by CodeSpeak.

## Data sent to Gemini

Only explicitly invoked AI workflows send data. Depending on the command, a request can contain:

- The selected source code.
- The active language identifier.
- A selected diagnostic message, code, severity, and source location.
- A user-provided code-generation instruction.

CodeSpeak does not send the entire workspace for the implemented `0.2.0` workflows. Folder and workspace summaries require confirmation and are limited to 12 text/code files, 5,000 characters per file, and 60,000 characters total. Common credential, private-key, dependency, build, hidden, and version-control paths are excluded. Provider-side response storage is disabled where the Gemini API supports that option.

## Stored data

- The Gemini key is stored using VS Code SecretStorage.
- Accessibility settings are stored through VS Code configuration.
- CodeSpeak does not store voice audio, transcripts, prompts, responses, or telemetry.
- Preview documents are transient VS Code documents and are not automatically written to the workspace.

## User control

- AI features remain inactive until the user saves a key and invokes an AI command.
- Voice input is optional.
- Continuous voice mode requires modal confirmation and exposes an announced listening state.
- Mutating voice commands require confirmation.
- The API key can be removed with **CodeSpeak AI: Clear Gemini API Key**.

## Third parties

Users are responsible for reviewing the Google Gemini and Microsoft VS Code Speech terms and privacy policies applicable to their installation and account.
