# Security policy

## Supported versions

Only the latest published CodeSpeak AI preview is supported while the project is below version `1.0.0`.

## Reporting a vulnerability

Do not disclose suspected vulnerabilities in a public issue. Contact the CodeSpeak AI publisher through the private contact method configured in the Marketplace publisher profile. Include a minimal reproduction without credentials, personal information, or proprietary source code.

The repository will publish a dedicated private security-reporting address before general availability.

## Security boundaries

- Gemini and OpenAI credentials are stored separately in VS Code SecretStorage.
- Gemini credentials are sent only to the configured Google Gemini API endpoint.
- OpenAI credentials are sent only to the OpenAI Responses API for explicitly invoked primary AI operations.
- Gemini credentials are used only after an eligible OpenAI failure.
- CodeSpeak does not execute generated code.
- Generated edits require preview or confirmation.
- Voice audio is processed by the optional Microsoft VS Code Speech extension; CodeSpeak consumes transcript text.
- Workspace text is included only in explicitly invoked operations and is bounded by the relevant command context.
- No telemetry is collected by CodeSpeak AI `0.2.0`.

## Dependency policy

Release checks run `npm audit`, strict TypeScript compilation, linting, coverage thresholds, accessibility contracts, and VS Code Extension Host integration tests. Dependencies are locked in `package-lock.json`.
