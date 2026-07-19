import { describe, expect, it, vi } from 'vitest';
import { GenerateCode } from '../../../src/application/use-cases/ai/generate-code';
import type { AiProvider } from '../../../src/application/ports/ai/ai-provider';
import type { EditorGateway } from '../../../src/application/ports/platform/editor-gateway';
import type { UserInterfaceGateway } from '../../../src/application/ports/platform/user-interface-gateway';
import type { AiOutputParser, AiRequest, AiResponse } from '../../../src/domain/ai/ai-contracts';
import type { OperationResult } from '../../../src/domain/shared/operation-error';
import { generatedCodeParser } from '../../../src/infrastructure/ai/validation/ai-output-parsers';

class ParsedFakeAiProvider implements AiProvider {
  public readonly id = 'fake';

  public constructor(private readonly output: unknown) {}

  public generate<TOutput>(
    _request: AiRequest,
    outputParser: AiOutputParser<TOutput>,
  ): Promise<OperationResult<AiResponse<TOutput>>> {
    const parsed = outputParser.parse(this.output);
    if (!parsed.ok) {
      return Promise.resolve(parsed);
    }
    return Promise.resolve({
      ok: true,
      value: { output: parsed.value, model: 'test-model' },
    });
  }
}

function createEditor(): {
  readonly editor: EditorGateway;
  readonly applyEdit: ReturnType<typeof vi.fn>;
  readonly showPreview: ReturnType<typeof vi.fn>;
} {
  const applyEdit = vi.fn().mockResolvedValue(true);
  const showPreview = vi.fn().mockResolvedValue(undefined);
  return {
    applyEdit,
    showPreview,
    editor: {
      getActiveDocument: () =>
        Promise.resolve({
          uri: 'file:///example.ts',
          languageId: 'typescript',
          version: 1,
          content: '',
        }),
      getSelection: () =>
        Promise.resolve({
          text: '',
          range: {
            start: { line: 2, character: 4 },
            end: { line: 2, character: 4 },
          },
        }),
      insertText: () => Promise.resolve(true),
      applyEdit,
      showPreview,
      openDocument: () => Promise.resolve(true),
      revealPosition: () => Promise.resolve(),
      undo: () => Promise.resolve(),
      redo: () => Promise.resolve(),
    },
  };
}

function createUserInterface(confirmed: boolean): UserInterfaceGateway {
  return {
    announce: () => Promise.resolve(),
    showInformation: () => Promise.resolve(),
    showWarning: () => Promise.resolve(),
    showError: () => Promise.resolve(),
    choose: () => Promise.resolve(undefined),
    requestText: () => Promise.resolve(undefined),
    confirm: () => Promise.resolve(confirmed),
    showProgress: (_title, operation) => operation(new AbortController().signal),
  };
}

const generatedOutput = {
  code: 'const answer = 42;',
  explanation: 'Creates a constant.',
  languageId: 'typescript',
};

describe('GenerateCode', () => {
  it('previews but does not apply generated code when confirmation is declined', async () => {
    const { editor, applyEdit, showPreview } = createEditor();
    const useCase = new GenerateCode(
      new ParsedFakeAiProvider(generatedOutput),
      generatedCodeParser,
      editor,
      createUserInterface(false),
    );

    await useCase.execute('Create a constant');

    expect(showPreview).toHaveBeenCalledWith(
      'CodeSpeak generated code',
      generatedOutput.code,
      'typescript',
    );
    expect(applyEdit).not.toHaveBeenCalled();
  });

  it('applies confirmed code to the original selection', async () => {
    const { editor, applyEdit } = createEditor();
    const useCase = new GenerateCode(
      new ParsedFakeAiProvider(generatedOutput),
      generatedCodeParser,
      editor,
      createUserInterface(true),
    );

    await useCase.execute('Create a constant');

    expect(applyEdit).toHaveBeenCalledWith({
      explanation: generatedOutput.explanation,
      replacement: generatedOutput.code,
      target: {
        uri: 'file:///example.ts',
        range: {
          start: { line: 2, character: 4 },
          end: { line: 2, character: 4 },
        },
      },
    });
  });
});
