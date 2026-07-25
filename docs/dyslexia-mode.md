# Dyslexia Mode

Dyslexia Mode is a configurable reading preference. It is not a treatment or medical claim. Each
visual option can be changed because no single presentation works for every reader.

## Enable and configure

1. Run `CodeSpeak AI: Toggle Dyslexia Mode`.
2. Run `CodeSpeak AI: Configure Dyslexia Font` to choose OpenDyslexic, Atkinson Hyperlegible,
   Lexend, the current editor font, or a custom installed font.
3. Run `CodeSpeak AI: Configure Dyslexia Mode` to change one reading preference at a time.
4. Use the visible `CodeSpeak: Dyslexia Mode` status item to disable the mode.

VS Code does not provide a reliable font availability API. CodeSpeak applies the selected font
first, followed by Consolas, Courier New, and the system monospace font. Install the preferred font
through the operating system, then restart VS Code if the font does not appear. CodeSpeak does not
bundle or install font files.

## Reading assistance

The mode can apply configurable font size, line height, letter spacing, cursor width, line
highlighting, wrapping, minimap visibility, breadcrumbs, CodeLens, sticky scroll, indentation
guides, native bracket colors, and native bracket guides.

Current block highlighting uses the language document symbol provider when available. It falls
back to a bounded indentation block when symbols are unavailable. Decorations use VS Code theme
colors. Optional inactive code dimming is disabled by default.

These commands keep explanations small and structured:

- `CodeSpeak AI: Explain Current Error Simply`
- `CodeSpeak AI: Explain Selected Code Simply`
- `CodeSpeak AI: Simplify This Explanation`
- `CodeSpeak AI: Explain Current Line`
- `CodeSpeak AI: Explain Current Block`
- `CodeSpeak AI: Explain Current Function Simply`
- `CodeSpeak AI: Summarize File in Simple Language`
- `CodeSpeak AI: Break Code Into Steps`
- `CodeSpeak AI: Read Ambiguous Characters`
- `CodeSpeak AI: Where Am I`

When simplified explanations are enabled, the standard Explain Selected Code, Explain Diagnostic,
Explain Current Function, and Summarize Current File commands also use the dyslexia friendly
format while the profile is active.

Diagnostic requests include the diagnostic and no more than two surrounding lines on each side.
Selection requests respect `codespeak.privacy.includeSelectionInAiRequests`. File summaries are
explicit user actions and are limited to twelve thousand characters.

## Safe restoration

CodeSpeak applies profile values as workspace overrides. Before applying a value, it records
whether a workspace value existed and its exact value. When the mode is disabled:

- A value is restored only when the current value still matches the value applied by CodeSpeak.
- A manual change made while the mode is active is preserved.
- When no workspace value originally existed, CodeSpeak removes its override so the existing user
  level value becomes effective again.
- The original backup is not replaced by repeated profile updates.

Focus Mode uses native VS Code Zen Mode. VS Code restores its previous layout when the command is
run again.

## Manual test

1. Record the current editor font, size, line height, minimap, breadcrumbs, and bracket settings.
2. Run `CodeSpeak AI: Toggle Dyslexia Mode`.
3. Confirm the status item appears and the configured typography and spacing are applied.
4. Move the cursor between functions and confirm the highlighted block follows it.
5. Run Configure Dyslexia Mode and change one option. Confirm it updates immediately.
6. Create a compiler error and run Explain Current Error Simply.
7. Select code and run Break Code Into Steps.
8. Run Read Ambiguous Characters on a line containing uppercase O, number zero, lowercase L,
   number one, brackets, a colon, or a semicolon.
9. Run Toggle Dyslexia Focus Mode twice and confirm the normal layout returns.
10. While Dyslexia Mode is active, manually change editor font size.
11. Disable Dyslexia Mode. Confirm the manual font size is preserved and the other original
    workspace settings return.
12. Reload VS Code. Confirm the selected profile, status item, and applied settings remain
    consistent.

## Known limitations

- Font installation and reliable font detection are outside the VS Code extension API.
- VS Code has no editor word spacing setting. CodeSpeak can adjust character and line spacing.
- Document symbol quality depends on the installed language extension.
- Indentation fallback cannot perfectly identify every brace based or unusual language block.
- Zen Mode restoration is controlled by VS Code.
- Dimming changes opacity and may be unsuitable for some themes, so it remains off by default.
- Multi root workspaces receive workspace level overrides rather than separate folder overrides.
