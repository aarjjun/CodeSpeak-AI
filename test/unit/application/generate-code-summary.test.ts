import { describe, expect, it, vi } from 'vitest';
import type { AiProvider } from '../../../src/application/ports/ai/ai-provider';
import type { EditorGateway } from '../../../src/application/ports/platform/editor-gateway';
import type { UserInterfaceGateway } from '../../../src/application/ports/platform/user-interface-gateway';
import type { WorkspaceGateway } from '../../../src/application/ports/platform/workspace-gateway';
import type { SpeechSynthesizer } from '../../../src/application/ports/speech/speech-synthesizer';
import { AccessibilityProfileService } from '../../../src/application/services/accessibility-profile-service';
import { GenerateCodeSummary } from '../../../src/application/use-cases/ai/generate-code-summary';
import type { AiOutputParser, AiRequest, AiResponse } from '../../../src/domain/ai/ai-contracts';
import { AccessibilityProfileCatalog } from '../../../src/domain/accessibility/accessibility-profile-catalog';
import type { OperationResult } from '../../../src/domain/shared/operation-error';
import { codeSummaryParser } from '../../../src/infrastructure/ai/validation/ai-output-parsers';

class CapturingAiProvider implements AiProvider {
  public readonly id = 'test';
  public request: AiRequest | undefined;

  public generate<TOutput>(
    request: AiRequest,
    parser: AiOutputParser<TOutput>,
  ): Promise<OperationResult<AiResponse<TOutput>>> {
    this.request = request;
    const result = parser.parse({
      title: 'Authentication overview',
      overview: 'This code validates users.',
      responsibilities: ['Validate credentials.'],
      architecture: ['A service owns authentication.'],
      importantFiles: [{ path: 'auth.ts', purpose: 'Authenticates users.' }],
      entryPoints: ['login'],
      cautions: [],
    });
    return Promise.resolve(
      result.ok ? { ok: true, value: { output: result.value, model: 'test' } } : result,
    );
  }
}

function createEditor(showPreview = vi.fn().mockResolvedValue(undefined)): EditorGateway {
  return {
    getActiveDocument: () =>
      Promise.resolve({
        uri: 'file:///workspace/src/auth.ts',
        languageId: 'typescript',
        version: 1,
        content: 'export function login() { return true; }',
      }),
    getSelection: () => Promise.resolve(undefined),
    insertText: () => Promise.resolve(false),
    applyEdit: () => Promise.resolve(false),
    showPreview,
    openDocument: () => Promise.resolve(false),
    revealPosition: () => Promise.resolve(),
    undo: () => Promise.resolve(),
    redo: () => Promise.resolve(),
  };
}

function createWorkspace(trusted = true): WorkspaceGateway {
  return {
    hasOpenWorkspace: () => true,
    isTrusted: () => trusted,
    findFiles: () => Promise.resolve([]),
    readDocument: (uri) =>
      Promise.resolve({ uri, languageId: 'typescript', version: 1, content: 'export {};' }),
    getContainingFolder: () => 'file:///workspace/src',
    listContextDocuments: () => Promise.resolve(['file:///workspace/src/auth.ts']),
  };
}

function createInterface(showWarning = vi.fn().mockResolvedValue(undefined)): UserInterfaceGateway {
  return {
    announce: () => Promise.resolve(),
    showInformation: () => Promise.resolve(),
    showWarning,
    showError: () => Promise.resolve(),
    choose: () => Promise.resolve(undefined),
    requestText: () => Promise.resolve(undefined),
    confirm: () => Promise.resolve(true),
    showProgress: (_title, operation) => operation(new AbortController().signal),
  };
}

function createProfiles(): AccessibilityProfileService {
  return new AccessibilityProfileService(
    {
      get: () => ({
        model: 'test',
        openAiModel: 'gpt-5.6-sol',
        voiceLanguage: 'en-US',
        voiceLanguageConfigured: false,
        voiceRate: 1,
        voiceRateConfigured: false,
        accessibilityProfile: 'custom',
        autoExplainErrors: false,
        autoReadSummaries: false,
        autoReadSummariesConfigured: true,
      }),
      setAccessibilityProfile: () => Promise.resolve(),
      onDidChange: () => () => undefined,
    },
    new AccessibilityProfileCatalog(),
  );
}

const speech: SpeechSynthesizer = {
  speak: () => Promise.resolve({ ok: true, value: undefined }),
  stop: () => Promise.resolve(),
};

describe('GenerateCodeSummary', () => {
  it('summarizes the active file and opens an accessible Markdown preview', async () => {
    const ai = new CapturingAiProvider();
    const showPreview = vi.fn().mockResolvedValue(undefined);
    await new GenerateCodeSummary(
      ai,
      codeSummaryParser,
      createEditor(showPreview),
      createWorkspace(),
      createInterface(),
      createProfiles(),
      speech,
    ).execute('file');

    expect(ai.request?.capability).toBe('summary-generation');
    expect(ai.request?.context).toHaveLength(1);
    expect(showPreview).toHaveBeenCalledWith(
      'Authentication overview',
      expect.stringContaining('## Responsibilities'),
      'markdown',
    );
  });

  it('does not collect multi-file context from an untrusted workspace', async () => {
    const warning = vi.fn().mockResolvedValue(undefined);
    const ai = new CapturingAiProvider();
    await new GenerateCodeSummary(
      ai,
      codeSummaryParser,
      createEditor(),
      createWorkspace(false),
      createInterface(warning),
      createProfiles(),
      speech,
    ).execute('workspace');

    expect(ai.request).toBeUndefined();
    expect(warning).toHaveBeenCalledWith(expect.stringContaining('Trust this workspace'));
  });

  it('collects bounded current-folder context only after confirmation', async () => {
    const ai = new CapturingAiProvider();
    const listContextDocuments = vi
      .fn()
      .mockResolvedValue(['file:///workspace/src/auth.ts', 'file:///workspace/src/session.ts']);
    const workspace = createWorkspace();
    workspace.listContextDocuments = listContextDocuments;

    await new GenerateCodeSummary(
      ai,
      codeSummaryParser,
      createEditor(),
      workspace,
      createInterface(),
      createProfiles(),
      speech,
    ).execute('folder');

    expect(listContextDocuments).toHaveBeenCalledWith(
      expect.objectContaining({
        maximumFiles: 12,
        maximumCharactersPerFile: 5_000,
        includeHiddenFiles: false,
      }),
      'file:///workspace/src',
    );
    expect(ai.request?.input).toMatchObject({ scope: 'folder', fileCount: '2' });
    expect(ai.request?.context).toHaveLength(2);
  });
});
