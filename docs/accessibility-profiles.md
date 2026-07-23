# Accessibility profiles

CodeSpeak profiles combine accessible reading behavior with reversible VS Code workspace
settings. When a visual profile is selected, CodeSpeak records the existing workspace values
before applying its preset. Switching profiles restores unchanged values before applying the next
preset. Selecting Custom Mode restores the recorded values and stops managing them.

## Dyslexia Mode

### Added behavior

- Uses OpenDyslexic when the font is installed, followed by standard coding font fallbacks.
- Increases font size, line height, and letter spacing.
- Wraps long lines.
- Enables native bracket pair colorization and bracket guides.
- Makes bracket characters bold in the active editor.
- Requests brief, grouped AI explanations through the profile reading policy.
- Reduces interface motion.

### Limitations

- VS Code extensions cannot install operating system fonts. If OpenDyslexic is not installed,
  VS Code uses the next font in the fallback list.
- Syntax coloring is controlled by the active VS Code theme. CodeSpeak enables bracket pair
  colors but cannot guarantee a particular contrast ratio for every third party theme.
- Simplified error explanations require a working AI provider. Deterministic diagnostics still
  show their original compiler wording.
- Dyslexia needs vary. The preset is a starting point and is not a medical assessment.

## Low Vision Mode

### Added behavior

- Increases the whole VS Code workspace scale.
- Uses an eighteen pixel editor font and thirty pixel line height.
- Uses a four pixel cursor and full line highlighting.
- Hides the minimap and reduces motion.
- Shows whitespace only for the current selection.

### Limitations

- CodeSpeak cannot control operating system magnification, display scaling, or screen reader
  magnification.
- The active theme determines final foreground and background contrast.
- Workspace zoom affects all VS Code controls. Very small displays may show less content.
- CodeSpeak does not automatically enable a high contrast theme because changing a user theme
  can be disruptive. Users can combine Low Vision Mode with a VS Code high contrast theme.

## ADHD Mode

### Added behavior

- Highlights the active line and the smallest function, method, or class containing the cursor.
- Hides the minimap, sticky scroll, CodeLens, hover popups, and breadcrumbs.
- Adds Toggle Focus View, which uses VS Code Zen Mode.
- Provides configurable focus and break timers with accessible status text and announcements.
- Requests brief, grouped AI responses through the profile reading policy.

### Limitations

- Active block highlighting depends on the language extension providing document symbols. When
  symbols are unavailable, the active line remains highlighted.
- Focus View is explicit and is not entered automatically, preventing an unexpected layout
  change or focus loss.
- The timer runs only while the extension host remains active and does not persist elapsed time
  across a VS Code reload.
- A one minute minimum is used for both focus and break durations.

## Motor Accessibility Mode

### Added behavior

- Increases the whole VS Code workspace scale.
- Enables the VS Code Command Center.
- Uses a wide cursor, full line highlighting, and no minimap.
- Enables the voice first CodeSpeak interaction policy.
- Requires confirmation for all profile aware AI editing actions.
- Adds Show Accessible Controls, a native Quick Pick containing common CodeSpeak actions.

### Limitations

- Extensions cannot resize individual native VS Code buttons. Workspace zoom enlarges the whole
  interface instead.
- Voice input requires Microsoft VS Code Speech and microphone permission. Typed voice simulation
  remains available without a microphone.
- VS Code and third party extension commands outside CodeSpeak may use their own confirmation
  behavior.
- Reduced precision interaction is limited by the VS Code extension API. CodeSpeak uses native
  Quick Pick, Input Box, Command Palette, Tree View, and voice routes where possible.

## Test every profile

### Preparation

1. Run `npm install`.
2. Run `npm test`.
3. Run `npm run check-types`.
4. Press F5 and wait for the Extension Development Host window.
5. Open a folder and a TypeScript file containing a function with brackets.
6. In the development host, open the Command Palette and run
   `CodeSpeak AI: Select Accessibility Profile`.

### Test Dyslexia Mode

1. Select Dyslexia Mode.
2. Confirm that text is larger, lines have more vertical space, and long lines wrap.
3. Confirm that brackets are bold and bracket pairs use different theme colors.
4. Open Settings and search for `Editor Font Family`. Confirm OpenDyslexic is first.
5. Select code and run `CodeSpeak AI: Explain Selected Code`. Confirm the response is brief and
   grouped.
6. If OpenDyslexic is installed but does not appear, reload the development host.

### Test Low Vision Mode

1. Select Low Vision Mode.
2. Confirm that the whole interface is enlarged.
3. Confirm that editor text is eighteen pixels, the cursor is wide, and the whole current line is
   highlighted.
4. Confirm that the minimap is hidden.
5. Move between lines and confirm the line highlight follows the cursor.

### Test ADHD Mode

1. Select ADHD Mode.
2. Put the cursor inside a TypeScript function.
3. Confirm that the current line and the containing function are highlighted.
4. Confirm that minimap, breadcrumbs, CodeLens, sticky scroll, and hover popups are hidden.
5. Run `CodeSpeak AI: Toggle Focus View`. Confirm VS Code enters Zen Mode. Run it again to exit.
6. Set `CodeSpeak AI › Focus: Minutes` to one and
   `CodeSpeak AI › Focus: Break Minutes` to one.
7. Run `CodeSpeak AI: Start Focus Timer`. Confirm the accessible status bar countdown.
8. Run Pause Focus Timer and Reset Focus Timer to verify both controls.
9. For the full reminder flow, let the one minute timer finish. Confirm that the break timer starts
   and announces the transition.

### Test Motor Accessibility Mode

1. Select Motor Accessibility Mode.
2. Confirm that the interface is enlarged, Command Center is visible, the cursor is wide, and the
   minimap is hidden.
3. Run `CodeSpeak AI: Show Accessible Controls`.
4. Navigate the picker with arrow keys, Tab, Enter, and a screen reader if available.
5. Choose Read Current Line and confirm that the command runs.
6. Run `CodeSpeak AI: Enter Voice Command as Text`, enter `show accessible controls`, and confirm
   that the same picker opens.
7. With VS Code Speech installed, press Control Alt Space and say `show accessible controls`.

### Test restoration

1. Before selecting a profile, set a distinctive workspace editor font size.
2. Select Low Vision Mode and confirm the profile font size is applied.
3. Select Custom Mode.
4. Confirm that the distinctive workspace font size returns.
5. Change a managed setting manually while a profile is active, then select Custom Mode.
6. Confirm that CodeSpeak preserves the manual change rather than overwriting it.
