# CodeSpeak AI support

CodeSpeak AI `0.2.0` is a preview release. Before reporting a problem:

1. Update to a supported VS Code version (`1.98.0` or newer).
2. Run **Developer: Show Running Extensions** and confirm CodeSpeak AI is active.
3. Open **View: Output**, select **CodeSpeak AI**, and review the latest technical message.
4. Reproduce the issue with the smallest non-sensitive example possible.

Include the CodeSpeak version, VS Code version, operating system, active accessibility profile, source language, exact command, expected behavior, and observed behavior.

For voice issues, also state whether Microsoft VS Code Speech is installed, whether editor dictation works independently, and which speech language is selected.

Never include:

- Gemini API keys or other credentials.
- Proprietary source code.
- Complete workspace contents.
- Voice recordings or transcripts containing personal information.

## Common recovery actions

- **No API key:** Run **CodeSpeak AI: Set Gemini API Key**.
- **Offline or rate limited:** Retry later; deterministic navigation and parsing remain available.
- **Voice input unavailable:** Install Microsoft VS Code Speech and verify microphone permission.
- **Linux speech output unavailable:** Install Speech Dispatcher and verify `spd-say` is on `PATH`.
- **Unsupported parser language:** Use AI explanation or wait for a deterministic parser adapter for that language.

The public issue tracker URL will be added to the Marketplace listing after the repository location is finalized.
