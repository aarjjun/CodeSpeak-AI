# Privacy model

CodeSpeak AI follows a minimal-context, explicit-action model.

## Data processed locally

- Editor selections and active-document content needed by deterministic parsers.
- VS Code diagnostics.
- Accessibility profile and configuration values.
- Voice transcripts produced by Microsoft VS Code Speech.
- Structural and JSX/TSX accessibility analysis.

Voice audio is handled by VS Code Speech and is not read or transmitted by CodeSpeak.

## Data sent to AI providers

Only explicitly invoked AI workflows send data. Depending on the command, a request can contain:

- The selected source code.
- The active language identifier.
- A selected diagnostic message, code, severity, and source location.
- A user-provided code-generation instruction.

CodeSpeak does not send the entire workspace for the implemented `0.2.0` workflows. Folder and workspace summaries require confirmation and are limited to 12 text/code files, 5,000 characters per file, and 60,000 characters total. Common credential, private-key, dependency, build, hidden, and version-control paths are excluded. Provider-side response storage is disabled.

## Provider order

When an OpenAI key is configured, CodeSpeak sends an explicitly requested AI operation to the OpenAI Responses API first. If OpenAI fails with a provider, quota, authentication, network, or invalid response error and a Gemini key is configured, CodeSpeak announces the provider switch before sending the same bounded request to Gemini. Gemini is not called after a successful OpenAI response or after a user cancellation.

## Stored data

- The Gemini key is stored using VS Code SecretStorage.
- The OpenAI key is stored separately using VS Code SecretStorage.
- Accessibility settings are stored through VS Code configuration.
- CodeSpeak does not store voice audio, transcripts, prompts, responses, or telemetry.
- Preview documents are transient VS Code documents and are not automatically written to the workspace.

## User control

- AI features remain inactive until the user saves a key and invokes an AI command.
- Voice input is optional.
- Continuous voice mode requires modal confirmation and exposes an announced listening state.
- Mutating voice commands require confirmation.
- The primary key can be removed with **CodeSpeak AI: Clear OpenAI API Key**.
- The optional fallback key can be removed with **CodeSpeak AI: Clear Gemini API Key**.

## Third parties

Users are responsible for reviewing the Google Gemini, OpenAI, and Microsoft VS Code Speech terms and privacy policies applicable to their installation and account.

GitHub Copilot voice requests are routed to the installed Copilot Chat experience. They are not sent to another AI provider. CodeSpeak opens a contextual draft where the current VS Code command supports it and requires the user to review and submit the request in Chat.
