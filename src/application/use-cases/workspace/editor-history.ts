import type { EditorGateway } from '../../ports/platform/editor-gateway';

export type EditorHistoryAction = 'undo' | 'redo';

export class EditorHistory {
  public constructor(private readonly editor: EditorGateway) {}

  public async execute(action: EditorHistoryAction): Promise<void> {
    if (action === 'undo') {
      await this.editor.undo();
      return;
    }
    await this.editor.redo();
  }
}
