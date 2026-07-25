import * as vscode from 'vscode';
import type { AiProvider } from '../../../application/ports/ai/ai-provider';
import type { UserInterfaceGateway } from '../../../application/ports/platform/user-interface-gateway';
import type { AccessibleSpeechService } from '../../../application/services/accessible-speech-service';
import { reportAiError } from '../../../application/use-cases/ai/report-ai-error';
import type { AiContextItem, AiRequest } from '../../../domain/ai/ai-contracts';
import {
  codeExplanationParser,
  diagnosticExplanationParser,
} from '../../../infrastructure/ai/validation/ai-output-parsers';
import { dyslexiaTask } from '../../../infrastructure/ai/prompts/dyslexia-prompt-builder';
import { findIndentationBlock } from './active-block-highlighter';

type CodeScope = 'selection' | 'line' | 'block' | 'function' | 'file' | 'steps' | 'explanation';

export class SimpleExplanationService {
  public constructor(
    private readonly ai: AiProvider,
    private readonly userInterface: UserInterfaceGateway,
    private readonly speech: AccessibleSpeechService,
  ) {}

  public async explainCode(scope: CodeScope): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (editor === undefined) {
      await this.userInterface.showWarning('Open a file before requesting a simple explanation.');
      return;
    }
    const context = await this.codeContext(editor, scope);
    if (context === undefined) return;
    const request: AiRequest = {
      capability: 'code-explanation',
      promptId: 'dyslexia.code.explain',
      input: {
        languageId: editor.document.languageId,
        task: dyslexiaTask(taskForScope(scope)),
      },
      context: [
        {
          kind: scope === 'explanation' ? 'conversation' : 'selection',
          content: context.text.slice(0, 12_000),
          languageId: editor.document.languageId,
          source: {
            uri: editor.document.uri.toString(),
            range: {
              start: {
                line: context.range.start.line,
                character: context.range.start.character,
              },
              end: { line: context.range.end.line, character: context.range.end.character },
            },
          },
        },
      ],
    };
    const result = await this.userInterface.showProgress(
      'CodeSpeak is creating a simple explanation',
      (signal) => this.ai.generate(request, codeExplanationParser, signal),
    );
    if (!result.ok) {
      await reportAiError(result.error, this.userInterface, this.speech);
      return;
    }
    const explanation = result.value.output;
    await this.showMarkdown([
      '# Simple code explanation',
      '',
      '## Purpose',
      explanation.summary,
      '',
      '## Main steps',
      ...explanation.details.map((step, index) => `${String(index + 1)}. ${step}`),
      '',
      '## How it works',
      explanation.whyItWorks,
      ...(explanation.considerations.length === 0
        ? []
        : ['', '## Possible problems', ...explanation.considerations.map((item) => `* ${item}`)]),
    ]);
    await this.speech.speak(explanation.summary);
  }

  public async explainCurrentDiagnostic(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (editor === undefined) {
      await this.userInterface.showWarning('Open a file before explaining an error.');
      return;
    }
    const line = editor.selection.active.line;
    const diagnostics = vscode.languages
      .getDiagnostics(editor.document.uri)
      .filter((item) => item.range.start.line <= line && item.range.end.line >= line);
    if (diagnostics.length === 0) {
      await this.userInterface.showInformation('No error or warning is present on this line.');
      return;
    }
    const diagnostic = diagnostics[0];
    if (diagnostic === undefined) return;
    const startLine = Math.max(0, diagnostic.range.start.line - 2);
    const endLine = Math.min(editor.document.lineCount - 1, diagnostic.range.end.line + 2);
    const codeRange = new vscode.Range(
      startLine,
      0,
      endLine,
      editor.document.lineAt(endLine).text.length,
    );
    const context: AiContextItem[] = [
      {
        kind: 'diagnostic',
        content: diagnostic.message,
        source: {
          uri: editor.document.uri.toString(),
          range: {
            start: {
              line: diagnostic.range.start.line,
              character: diagnostic.range.start.character,
            },
            end: {
              line: diagnostic.range.end.line,
              character: diagnostic.range.end.character,
            },
          },
        },
      },
      {
        kind: 'selection',
        content: editor.document.getText(codeRange),
        languageId: editor.document.languageId,
      },
    ];
    const request: AiRequest = {
      capability: 'diagnostic-explanation',
      promptId: 'dyslexia.diagnostic.explain',
      input: {
        message: diagnostic.message,
        severity: vscode.DiagnosticSeverity[diagnostic.severity],
        source: diagnostic.source ?? 'unknown',
        code: diagnosticCode(diagnostic.code),
        task: dyslexiaTask('Explain the error and give short steps to fix it.'),
      },
      context,
    };
    const result = await this.userInterface.showProgress(
      'CodeSpeak is explaining the error simply',
      (signal) => this.ai.generate(request, diagnosticExplanationParser, signal),
    );
    if (!result.ok) {
      await reportAiError(result.error, this.userInterface, this.speech);
      return;
    }
    const explanation = result.value.output;
    await this.showMarkdown([
      '# Simple error explanation',
      '',
      '## What went wrong',
      explanation.plainLanguageExplanation,
      '',
      '## Likely cause',
      explanation.likelyCause,
      '',
      '## How to fix it',
      ...explanation.suggestedNextSteps.map((step, index) => `${String(index + 1)}. ${step}`),
    ]);
    await this.speech.speak(explanation.plainLanguageExplanation);
  }

  private async codeContext(
    editor: vscode.TextEditor,
    scope: CodeScope,
  ): Promise<{ readonly text: string; readonly range: vscode.Range } | undefined> {
    if (
      !editor.selection.isEmpty &&
      !vscode.workspace
        .getConfiguration('codespeak.privacy')
        .get<boolean>('includeSelectionInAiRequests', true)
    ) {
      await this.userInterface.showWarning(
        'Selected code sharing is disabled in CodeSpeak privacy settings.',
      );
      return undefined;
    }
    if (scope === 'selection' || scope === 'explanation') {
      const range = editor.selection.isEmpty
        ? editor.document.lineAt(editor.selection.active.line).range
        : editor.selection;
      return { text: editor.document.getText(range), range };
    }
    if (scope === 'line') {
      const range = editor.document.lineAt(editor.selection.active.line).range;
      return { text: editor.document.getText(range), range };
    }
    if (scope === 'file') {
      const lastLine = editor.document.lineCount - 1;
      const range = new vscode.Range(0, 0, lastLine, editor.document.lineAt(lastLine).text.length);
      return { text: editor.document.getText(range), range };
    }
    const symbol = await currentSymbol(editor, scope === 'function');
    if (symbol !== undefined) {
      return { text: editor.document.getText(symbol.range), range: symbol.range };
    }
    const lines = Array.from(
      { length: editor.document.lineCount },
      (_, index) => editor.document.lineAt(index).text,
    );
    const fallback = findIndentationBlock(lines, editor.selection.active.line);
    const range = new vscode.Range(
      fallback.startLine,
      0,
      fallback.endLine,
      editor.document.lineAt(fallback.endLine).text.length,
    );
    return { text: editor.document.getText(range), range };
  }

  private async showMarkdown(lines: readonly string[]): Promise<void> {
    const document = await vscode.workspace.openTextDocument({
      content: lines.join('\n'),
      language: 'markdown',
    });
    await vscode.window.showTextDocument(document, {
      preview: true,
      preserveFocus: false,
      viewColumn: vscode.ViewColumn.Beside,
    });
  }
}

async function currentSymbol(
  editor: vscode.TextEditor,
  functionOnly: boolean,
): Promise<vscode.DocumentSymbol | undefined> {
  const symbols =
    (await vscode.commands.executeCommand<readonly vscode.DocumentSymbol[] | undefined>(
      'vscode.executeDocumentSymbolProvider',
      editor.document.uri,
    )) ?? [];
  const containing = flattenSymbols(symbols)
    .filter((symbol) => symbol.range.contains(editor.selection.active))
    .filter(
      (symbol) =>
        !functionOnly ||
        [
          vscode.SymbolKind.Function,
          vscode.SymbolKind.Method,
          vscode.SymbolKind.Constructor,
        ].includes(symbol.kind),
    )
    .sort((left, right) => rangeSize(left.range) - rangeSize(right.range));
  return containing[0];
}

function flattenSymbols(
  symbols: readonly vscode.DocumentSymbol[],
): readonly vscode.DocumentSymbol[] {
  return symbols.flatMap((symbol) => [symbol, ...flattenSymbols(symbol.children)]);
}

function rangeSize(range: vscode.Range): number {
  return (
    (range.end.line - range.start.line) * 100_000 + range.end.character - range.start.character
  );
}

function taskForScope(scope: CodeScope): string {
  const tasks: Readonly<Record<CodeScope, string>> = {
    selection: 'Explain the selected code.',
    line: 'Explain the current line.',
    block: 'Explain the current code block.',
    function: 'Explain the current function using Purpose, Inputs, Main steps, Output, and Errors.',
    file: 'Summarize the file in simple language. Mention only important responsibilities.',
    steps: 'Break this code into a short numbered sequence of steps.',
    explanation: 'Rewrite this explanation using simpler and shorter language.',
  };
  return tasks[scope];
}

function diagnosticCode(code: vscode.Diagnostic['code']): string {
  if (code === undefined) return 'unknown';
  if (typeof code === 'string' || typeof code === 'number') return String(code);
  return String(code.value);
}
