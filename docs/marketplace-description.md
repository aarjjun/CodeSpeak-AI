# CodeSpeak AI

**The AI-powered accessibility assistant for developers.**

CodeSpeak AI adapts Visual Studio Code for developers who are blind, have low vision, experience dyslexia or ADHD, or simply benefit from clearer code explanations and lower-cognitive-load navigation.

## Highlights

- **Structural Code Reader:** Understand JavaScript and TypeScript files through AST-based summaries of functions, classes, imports, parameters, control flow, calls, and return behavior.
- **AI Error Explainer:** Turn compiler and linter diagnostics into plain-language explanations and practical next steps.
- **Confirmed Code Generation:** Describe code in natural language, preview the result, and decide whether to insert it.
- **Accessible Documentation:** Generate docstrings, JSDoc, Javadoc, and Doxygen comments from a selection.
- **Accessibility Checker:** Publish deterministic JSX and TSX findings for alternative text, labels, keyboard access, focusability, and accessible names.
- **Accessibility Profiles:** Choose behavior designed for blind, low-vision, dyslexia, or ADHD workflows.
- **Optional Voice Control:** Navigate and request code through local Microsoft VS Code Speech transcription.
- **Spoken Output:** Read selections and structural summaries aloud with screen-reader announcements as the independent fallback.
- **Project Summaries:** Summarize a file, current folder, or workspace in a structured, screen-reader-friendly Markdown preview.

## Designed for trust

CodeSpeak does not silently modify source code. Generated edits are previewed and confirmed. Multi-file summaries require confirmation and use strict file and character budgets. API keys use VS Code SecretStorage. Voice audio remains inside VS Code Speech, and CodeSpeak collects no telemetry in the `0.2.1` preview.

## Keyboard first

Every capability is available from the Command Palette. Voice is optional, listening state is visible and announced, and mutating voice commands require confirmation.

## Requirements

- VS Code 1.98.0 or newer.
- OpenAI API key for AI generation and explanations.
- Optional Gemini API key for fallback requests.
- Optional Microsoft VS Code Speech extension for voice input.

Deterministic navigation, structural parsing, accessibility checks, profiles, and local speech remain available without an AI provider.

## Preview scope

The preview supports structural parsing for JavaScript/TypeScript and deterministic accessibility rules for JSX/TSX. Dedicated chat, learning workflows, and more parser languages are on the roadmap.
