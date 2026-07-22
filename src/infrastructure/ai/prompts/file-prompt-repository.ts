import * as vscode from 'vscode';
import type {
  PromptRepository,
  PromptTemplate,
} from '../../../application/ports/ai/prompt-repository';
import type { PromptVariables } from '../../../domain/ai/ai-contracts';

const PROMPT_FILES: Readonly<Record<string, string>> = {
  'system.accessibility': 'system-accessibility.prompt.md',
  'code.generate': 'code-generation.prompt.md',
  'code.explain': 'code-explanation.prompt.md',
  'diagnostic.explain': 'diagnostic-explanation.prompt.md',
  'documentation.generate': 'documentation-generation.prompt.md',
  'learning.assist': 'learning-assistance.prompt.md',
  'summary.generate': 'summary-generation.prompt.md',
  'voice.classify': 'voice-intent-classification.prompt.md',
};

export class FilePromptRepository implements PromptRepository {
  private readonly cache = new Map<string, PromptTemplate>();

  public constructor(private readonly extensionUri: vscode.Uri) {}

  public async get(promptId: string): Promise<PromptTemplate | undefined> {
    const cached = this.cache.get(promptId);
    if (cached !== undefined) {
      return cached;
    }

    const fileName = PROMPT_FILES[promptId];
    if (fileName === undefined) {
      return undefined;
    }

    const uri = vscode.Uri.joinPath(this.extensionUri, 'resources', 'prompts', fileName);
    const bytes = await vscode.workspace.fs.readFile(uri);
    const template = new TextPromptTemplate(promptId, new TextDecoder().decode(bytes));
    this.cache.set(promptId, template);
    return template;
  }
}

class TextPromptTemplate implements PromptTemplate {
  public readonly version = 1;

  public constructor(
    public readonly id: string,
    private readonly content: string,
  ) {}

  public render(input: PromptVariables): string {
    return this.content.replace(/\{\{([a-zA-Z][a-zA-Z0-9]*)\}\}/gu, (placeholder, key: string) => {
      return input[key] ?? placeholder;
    });
  }
}
