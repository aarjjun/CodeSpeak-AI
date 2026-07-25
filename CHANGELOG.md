# Changelog

All notable changes to CodeSpeak AI are documented here.

This project follows [Semantic Versioning](https://semver.org/).

## Unreleased

### Added

- Voice-first Blind Mode with deterministic command resolution and explicit dictation fallback.
- A shared command registry used by Command Palette and voice actions.
- Context-aware selection, line, symbol, folder, workspace, and diagnostic reading.
- GitHub Copilot Chat routing without Gemini fallback.
- Spoken destructive-action confirmation, speech controls, configurable silence timeout, and optional audio cues.
- Voice intent classification for unmatched requests and tests for common recognition variants.
- Configurable, reversible Dyslexia Mode typography and visual simplification settings.
- Theme-aware current line and block tracking with an indentation fallback.
- Dyslexia-friendly diagnostic, selection, line, block, function, file, and step explanations.
- Dyslexia font setup, focused reading, ambiguous character assistance, status indication, and
  voice aliases.

## [0.2.0] - 2026-07-19

### Added

- Accessible AI summaries for the current file, current folder, and workspace.
- Structured, validated summary output with responsibilities, architecture, important files, entry points, and cautions.
- Linear Markdown previews, screen-reader announcements, and profile-controlled spoken summaries.

### Security and privacy

- Multi-file summaries require a trusted workspace and explicit confirmation.
- Summary context is limited to 12 text/code files, 5,000 characters per file, and 60,000 characters total.
- Common credential, private-key, dependency, build, hidden, and version-control paths are excluded.

## [0.1.1] - 2026-07-19

### Changed

- Lowered the minimum supported VS Code version to 1.98.0 after compiling and running the Extension Host suite against that API/runtime baseline.

## [0.1.0] - 2026-07-18

### Added

- Gemini-backed code generation with preview and confirmation before insertion.
- Plain-language explanations for selected code and VS Code diagnostics.
- Documentation generation for Python, JavaScript, TypeScript, Java, C, and C++.
- TypeScript AST structural summaries for JavaScript, JSX, TypeScript, and TSX.
- Deterministic JSX and TSX accessibility checks published to the Problems panel.
- Blind, low-vision, dyslexia, ADHD, and custom profiles.
- Keyboard-accessible file, line, symbol, diagnostic, undo, and redo navigation.
- Local voice recognition through the optional Microsoft VS Code Speech extension.
- Confirmed continuous voice mode and allowlisted voice intents.
- Offline desktop speech output with screen-reader announcement fallback.
- Secure Gemini key storage using VS Code SecretStorage.
- Unit, accessibility-contract, coverage, and VS Code Extension Host test suites.

### Security and privacy

- Gemini requests disable provider-side response storage where supported.
- Voice audio remains within VS Code Speech; CodeSpeak receives only transcript text.
- Generated edits require explicit review or confirmation.

### Known limitations

- Structural parsing currently supports JavaScript and TypeScript language families.
- The accessibility checker currently targets deterministic JSX and TSX rules.
- The learning assistant and dedicated AI chat interface remain roadmap features.
