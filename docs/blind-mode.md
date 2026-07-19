# Blind Mode voice interaction

Blind Mode uses Microsoft VS Code Speech for local transcription. CodeSpeak receives transcript text, resolves deterministic commands first, and asks Gemini to classify only transcripts that did not match a known command. Spoken input is inserted into the editor only when the resolved intent is dictation.

## Resolution order

1. Stop, pause, continue, confirm, and cancel.
2. Exact aliases from the shared CodeSpeak command registry.
3. Line and range navigation.
4. Copilot Chat requests.
5. Folder and editor navigation.
6. Code generation and modification.
7. Explicit dictation.
8. Gemini intent classification when configured.
9. Accessible ambiguity feedback.

## Useful phrases

- Read selected code.
- Explain current function.
- Read line twenty six.
- Read lines 26 to 30.
- Where am I?
- Read current error.
- Read next error.
- Open folder.
- Open the Downloads folder.
- Ask Copilot to explain this function.
- Type hello world.
- List CodeSpeak commands.
- Stop reading.
- Repeat that.

## Safety and privacy

- CodeSpeak does not store voice recordings or transcripts.
- Workspace changes, renames, generated edits, and other mutating actions retain confirmation boundaries.
- Copilot requests are opened in GitHub Copilot Chat and are never silently sent to Gemini.
- The selected code can be excluded from Copilot prompts with the CodeSpeak privacy setting.
- Native VS Code controls are used instead of custom webviews.

## Copilot limitation

VS Code exposes a supported command for opening Chat, but it does not expose a stable public API that allows one extension to submit a request directly to another extension's Copilot participant. CodeSpeak opens Chat with a contextual draft where supported, then announces that the user should review and submit it.
