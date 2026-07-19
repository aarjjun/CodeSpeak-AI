import { describe, expect, it, vi } from 'vitest';
import type { AiProvider } from '../../../src/application/ports/ai/ai-provider';
import type { DiagnosticsGateway } from '../../../src/application/ports/platform/diagnostics-gateway';
import type { EditorGateway } from '../../../src/application/ports/platform/editor-gateway';
import type { UserInterfaceGateway } from '../../../src/application/ports/platform/user-interface-gateway';
import { ExplainDiagnostic } from '../../../src/application/use-cases/ai/explain-diagnostic';
import { ExplainSelection } from '../../../src/application/use-cases/ai/explain-selection';
import { GenerateDocumentation } from '../../../src/application/use-cases/ai/generate-documentation';
import type { AiOutputParser, AiRequest, AiResponse } from '../../../src/domain/ai/ai-contracts';
import type { CodeDiagnostic } from '../../../src/domain/diagnostics/diagnostic-contracts';
import type { OperationResult } from '../../../src/domain/shared/operation-error';
import {
  codeExplanationParser,
  diagnosticExplanationParser,
  documentationGenerationParser,
} from '../../../src/infrastructure/ai/validation/ai-output-parsers';

class CapturingAiProvider implements AiProvider {
  public readonly id = 'test-ai';
  public request: AiRequest | undefined;

  public constructor(private readonly rawOutput: unknown) {}

  public generate<TOutput>(
    request: AiRequest,
    parser: AiOutputParser<TOutput>,
  ): Promise<OperationResult<AiResponse<TOutput>>> {
    this.request = request;
    const parsed = parser.parse(this.rawOutput);
    return Promise.resolve(
      parsed.ok ? { ok: true, value: { output: parsed.value, model: 'test-model' } } : parsed,
    );
  }
}

function editor(languageId = 'typescript'): {
  gateway: EditorGateway;
  showPreview: ReturnType<typeof vi.fn>;
  applyEdit: ReturnType<typeof vi.fn>;
} {
  const showPreview = vi.fn().mockResolvedValue(undefined);
  const applyEdit = vi.fn().mockResolvedValue(true);
  return {
    showPreview,
    applyEdit,
    gateway: {
      getActiveDocument: () =>
        Promise.resolve({
          uri: 'file:///workspace/example.ts',
          languageId,
          version: 1,
          content: 'function answer() { return 42; }',
        }),
      getSelection: () =>
        Promise.resolve({
          text: 'function answer() { return 42; }',
          range: { start: { line: 2, character: 0 }, end: { line: 2, character: 32 } },
        }),
      insertText: () => Promise.resolve(false),
      applyEdit,
      showPreview,
      openDocument: () => Promise.resolve(false),
      revealPosition: () => Promise.resolve(),
      undo: () => Promise.resolve(),
      redo: () => Promise.resolve(),
    },
  };
}

function userInterface(selected?: string): {
  gateway: UserInterfaceGateway;
  announce: ReturnType<typeof vi.fn>;
} {
  const announce = vi.fn().mockResolvedValue(undefined);
  return {
    announce,
    gateway: {
      announce,
      showInformation: () => Promise.resolve(),
      showWarning: () => Promise.resolve(),
      showError: () => Promise.resolve(),
      choose: () => Promise.resolve(selected),
      requestText: () => Promise.resolve(undefined),
      confirm: () => Promise.resolve(true),
      showProgress: (_title, operation) => operation(new AbortController().signal),
    },
  };
}

describe('AI assistance use cases', () => {
  it('explains the selected code with bounded selection context', async () => {
    const ai = new CapturingAiProvider({
      summary: 'Returns the number 42.',
      details: ['Declares a function.', 'Returns a numeric literal.'],
      considerations: [],
    });
    const targetEditor = editor();
    const interfaceState = userInterface();

    await new ExplainSelection(
      ai,
      codeExplanationParser,
      targetEditor.gateway,
      interfaceState.gateway,
    ).execute();

    expect(ai.request?.capability).toBe('code-explanation');
    expect(ai.request?.context).toHaveLength(1);
    expect(targetEditor.showPreview).toHaveBeenCalledWith(
      'CodeSpeak explanation',
      expect.stringContaining('Returns the number 42.'),
      'markdown',
    );
    expect(interfaceState.announce).toHaveBeenCalledWith('Returns the number 42.');
  });

  it('generates documentation and inserts it only after confirmation', async () => {
    const ai = new CapturingAiProvider({
      documentation: '/** Returns the answer. */',
      style: 'jsdoc',
      explanation: 'Documents the return value.',
    });
    const targetEditor = editor();

    await new GenerateDocumentation(
      ai,
      documentationGenerationParser,
      targetEditor.gateway,
      userInterface().gateway,
    ).execute();

    expect(ai.request?.input).toEqual({ languageId: 'typescript', style: 'jsdoc' });
    expect(targetEditor.applyEdit).toHaveBeenCalledWith({
      explanation: 'Documents the return value.',
      replacement: '/** Returns the answer. */\n',
      target: {
        uri: 'file:///workspace/example.ts',
        range: {
          start: { line: 2, character: 0 },
          end: { line: 2, character: 0 },
        },
      },
    });
  });

  it('explains a selected diagnostic in simple language', async () => {
    const diagnostic: CodeDiagnostic = {
      id: 'type-error',
      message: 'Property map does not exist on type object',
      code: '2339',
      source: 'typescript',
      severity: 'error',
      location: {
        uri: 'file:///workspace/example.ts',
        range: { start: { line: 3, character: 1 }, end: { line: 3, character: 4 } },
      },
    };
    const diagnostics: DiagnosticsGateway = {
      getForDocument: () => [diagnostic],
      getForWorkspace: () => [diagnostic],
    };
    const ai = new CapturingAiProvider({
      plainLanguageExplanation: 'You are calling map on a value that is not known to be an array.',
      likelyCause: 'The value has an object type.',
      suggestedNextSteps: ['Check the value type before calling map.'],
    });
    const targetEditor = editor();
    const interfaceState = userInterface(diagnostic.id);

    await new ExplainDiagnostic(
      ai,
      diagnosticExplanationParser,
      diagnostics,
      targetEditor.gateway,
      interfaceState.gateway,
    ).execute();

    expect(ai.request?.input).toMatchObject({ code: '2339', source: 'typescript' });
    expect(targetEditor.showPreview).toHaveBeenCalledWith(
      'CodeSpeak diagnostic explanation',
      expect.stringContaining('You are calling map'),
      'markdown',
    );
    expect(interfaceState.announce).toHaveBeenCalledWith(expect.stringContaining('calling map'));
  });
});
