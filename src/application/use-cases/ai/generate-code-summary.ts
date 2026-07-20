import type { AiProvider } from '../../ports/ai/ai-provider';
import type { EditorGateway } from '../../ports/platform/editor-gateway';
import type { UserInterfaceGateway } from '../../ports/platform/user-interface-gateway';
import type { WorkspaceGateway } from '../../ports/platform/workspace-gateway';
import type { SpeechSynthesizer } from '../../ports/speech/speech-synthesizer';
import type { AccessibilityProfileService } from '../../services/accessibility-profile-service';
import type { AiContextItem, AiOutputParser, AiRequest } from '../../../domain/ai/ai-contracts';
import type { CodeSummaryResult, CodeSummaryScope } from '../../../domain/ai/ai-results';
import type { WorkspaceDocument } from '../../../domain/workspace/workspace-contracts';
import { reportAiError } from './report-ai-error';
import type { SpokenFeedback } from '../../ports/speech/spoken-feedback';

const MAXIMUM_FILES = 12;
const MAXIMUM_CHARACTERS_PER_FILE = 5_000;
const MAXIMUM_TOTAL_CHARACTERS = 60_000;
const INCLUDED_PATTERNS = [
  '**/*.{ts,tsx,js,jsx,mjs,cjs,py,java,c,cc,cpp,h,hpp,cs,go,rs,rb,php,swift,kt,kts,scala}',
  '**/*.{html,css,scss,sass,less,vue,svelte,json,yaml,yml,toml,xml,md,txt,sql,sh,bash,ps1}',
] as const;

export class GenerateCodeSummary {
  public constructor(
    private readonly ai: AiProvider,
    private readonly outputParser: AiOutputParser<CodeSummaryResult>,
    private readonly editor: EditorGateway,
    private readonly workspace: WorkspaceGateway,
    private readonly userInterface: UserInterfaceGateway,
    private readonly profiles: AccessibilityProfileService,
    private readonly speech: SpeechSynthesizer,
    private readonly spokenFeedback?: SpokenFeedback,
  ) {}

  public async execute(scope: CodeSummaryScope): Promise<void> {
    const documents = await this.collectDocuments(scope);
    if (documents === undefined || documents.length === 0) {
      return;
    }

    const context = this.createContext(documents, scope);
    const request: AiRequest = {
      capability: 'summary-generation',
      promptId: 'summary.generate',
      input: {
        scope,
        fileCount: documents.length.toString(),
        contextLimit: MAXIMUM_TOTAL_CHARACTERS.toLocaleString('en-US'),
      },
      context,
    };
    const result = await this.userInterface.showProgress(
      `CodeSpeak is summarizing the ${scope}`,
      (signal) => this.ai.generate(request, this.outputParser, signal),
    );
    if (!result.ok) {
      await reportAiError(result.error, this.userInterface, this.spokenFeedback);
      return;
    }

    const summary = result.value.output;
    await this.editor.showPreview(summary.title, this.formatSummary(summary, scope), 'markdown');
    await this.userInterface.announce(`${summary.title}. ${summary.overview}`);
    await this.readSummaryIfEnabled(summary);
  }

  private async collectDocuments(
    scope: CodeSummaryScope,
  ): Promise<readonly WorkspaceDocument[] | undefined> {
    const activeDocument = await this.editor.getActiveDocument();
    if (scope === 'file') {
      if (activeDocument === undefined) {
        await this.userInterface.showWarning(
          'Open a file before asking CodeSpeak to summarize it.',
        );
        return undefined;
      }
      return [
        {
          ...activeDocument,
          content: activeDocument.content.slice(0, MAXIMUM_TOTAL_CHARACTERS),
        },
      ];
    }

    if (!this.workspace.hasOpenWorkspace()) {
      await this.userInterface.showWarning(
        'Open a workspace before asking CodeSpeak for a folder or project summary.',
      );
      return undefined;
    }
    if (!this.workspace.isTrusted()) {
      await this.userInterface.showWarning(
        'Trust this workspace before sending multi-file context to Gemini.',
      );
      return undefined;
    }
    if (scope === 'folder' && activeDocument === undefined) {
      await this.userInterface.showWarning(
        'Open a file in the folder that you want CodeSpeak to summarize.',
      );
      return undefined;
    }

    const confirmed = await this.userInterface.confirm(
      `Summarize this ${scope}? Up to ${MAXIMUM_FILES.toString()} code and documentation files ` +
        'will be sent to Gemini. Credential, key, dependency, build, and version-control files are excluded.',
    );
    if (!confirmed) {
      await this.userInterface.announce('Summary cancelled.');
      return undefined;
    }

    const scopeUri =
      scope === 'folder' && activeDocument !== undefined
        ? this.workspace.getContainingFolder(activeDocument.uri)
        : undefined;
    const uris = await this.workspace.listContextDocuments(
      {
        maximumFiles: MAXIMUM_FILES,
        maximumCharactersPerFile: MAXIMUM_CHARACTERS_PER_FILE,
        includedPatterns: INCLUDED_PATTERNS,
        excludedPatterns: [],
        includeHiddenFiles: false,
      },
      scopeUri,
    );
    const documents: WorkspaceDocument[] = [];
    let remainingCharacters = MAXIMUM_TOTAL_CHARACTERS;
    for (const uri of uris) {
      if (remainingCharacters <= 0) {
        break;
      }
      try {
        const document = await this.workspace.readDocument(uri);
        if (document.content.includes('\u0000')) {
          continue;
        }
        const content = document.content.slice(
          0,
          Math.min(MAXIMUM_CHARACTERS_PER_FILE, remainingCharacters),
        );
        remainingCharacters -= content.length;
        documents.push({ ...document, content });
      } catch {
        // A file can disappear or become unreadable while the workspace is being collected.
      }
    }
    if (documents.length === 0) {
      await this.userInterface.showWarning(
        'CodeSpeak found no readable code or documentation files in that scope.',
      );
      return undefined;
    }
    return documents;
  }

  private createContext(
    documents: readonly WorkspaceDocument[],
    scope: CodeSummaryScope,
  ): readonly AiContextItem[] {
    return documents.map((document) => ({
      kind: scope === 'file' ? 'active-document' : 'workspace-summary',
      languageId: document.languageId,
      source: { uri: document.uri },
      content: [
        `Source: ${document.uri}`,
        `Language: ${document.languageId}`,
        '',
        document.content,
      ].join('\n'),
    }));
  }

  private formatSummary(summary: CodeSummaryResult, scope: CodeSummaryScope): string {
    return [
      `# ${summary.title}`,
      '',
      `Scope: ${scope}`,
      '',
      summary.overview,
      '',
      '## Responsibilities',
      ...summary.responsibilities.map((item) => `- ${item}`),
      ...this.section('Architecture', summary.architecture),
      ...(summary.importantFiles.length === 0
        ? []
        : [
            '',
            '## Important files',
            ...summary.importantFiles.map(
              (file) => `- \`${file.path.replaceAll('`', "'")}\`: ${file.purpose}`,
            ),
          ]),
      ...this.section('Entry points', summary.entryPoints),
      ...this.section('Cautions', summary.cautions),
    ].join('\n');
  }

  private section(title: string, items: readonly string[]): readonly string[] {
    return items.length === 0 ? [] : ['', `## ${title}`, ...items.map((item) => `- ${item}`)];
  }

  private async readSummaryIfEnabled(summary: CodeSummaryResult): Promise<void> {
    const speechPreferences = this.profiles.current().speech;
    if (!speechPreferences.enabled || !speechPreferences.autoReadSummaries) {
      return;
    }
    const result = await this.speech.speak(
      [summary.title, summary.overview, ...summary.responsibilities].join('. '),
      { language: speechPreferences.language, rate: speechPreferences.rate },
    );
    if (!result.ok && result.error.code !== 'cancelled') {
      await this.userInterface.showWarning(result.error.message);
    }
  }
}
