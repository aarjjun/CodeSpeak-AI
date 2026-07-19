import * as vscode from 'vscode';
import type {
  EditorGateway,
  EditorSelection,
} from '../../application/ports/platform/editor-gateway';
import type { ProposedCodeEdit } from '../../domain/diagnostics/diagnostic-contracts';
import type { DocumentUri, SourcePosition, SourceRange } from '../../domain/shared/source-location';
import type { WorkspaceDocument } from '../../domain/workspace/workspace-contracts';

export class VsCodeEditorGateway implements EditorGateway {
  public getActiveDocument(): Promise<WorkspaceDocument | undefined> {
    const document = vscode.window.activeTextEditor?.document;
    if (document === undefined) {
      return Promise.resolve(undefined);
    }
    return Promise.resolve({
      uri: document.uri.toString(),
      languageId: document.languageId,
      version: document.version,
      content: document.getText(),
    });
  }

  public getSelection(): Promise<EditorSelection | undefined> {
    const editor = vscode.window.activeTextEditor;
    if (editor === undefined) {
      return Promise.resolve(undefined);
    }
    return Promise.resolve({
      text: editor.document.getText(editor.selection),
      range: this.fromVsCodeRange(editor.selection),
    });
  }

  public async insertText(text: string): Promise<boolean> {
    const editor = vscode.window.activeTextEditor;
    if (editor === undefined) {
      return false;
    }
    return editor.edit((builder) => builder.replace(editor.selection, text));
  }

  public async applyEdit(edit: ProposedCodeEdit): Promise<boolean> {
    const workspaceEdit = new vscode.WorkspaceEdit();
    workspaceEdit.replace(
      vscode.Uri.parse(edit.target.uri),
      this.toVsCodeRange(edit.target.range),
      edit.replacement,
    );
    return vscode.workspace.applyEdit(workspaceEdit);
  }

  public async showPreview(_title: string, content: string, languageId: string): Promise<void> {
    const document = await vscode.workspace.openTextDocument({ content, language: languageId });
    await vscode.window.showTextDocument(document, {
      preview: true,
      preserveFocus: false,
      viewColumn: vscode.ViewColumn.Beside,
    });
  }

  public async openDocument(uri: DocumentUri): Promise<boolean> {
    try {
      const document = await vscode.workspace.openTextDocument(vscode.Uri.parse(uri));
      await vscode.window.showTextDocument(document, { preview: false });
      return true;
    } catch {
      return false;
    }
  }

  public revealPosition(position: SourcePosition): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (editor === undefined) {
      return Promise.resolve();
    }
    const target = new vscode.Position(position.line, position.character);
    editor.selection = new vscode.Selection(target, target);
    editor.revealRange(
      new vscode.Range(target, target),
      vscode.TextEditorRevealType.InCenterIfOutsideViewport,
    );
    return Promise.resolve();
  }

  public async undo(): Promise<void> {
    await vscode.commands.executeCommand('undo');
  }

  public async redo(): Promise<void> {
    await vscode.commands.executeCommand('redo');
  }

  private fromVsCodeRange(range: vscode.Range): SourceRange {
    return {
      start: { line: range.start.line, character: range.start.character },
      end: { line: range.end.line, character: range.end.character },
    };
  }

  private toVsCodeRange(range: SourceRange | undefined): vscode.Range {
    if (range === undefined) {
      throw new Error('A target range is required to apply an edit.');
    }
    return new vscode.Range(
      range.start.line,
      range.start.character,
      range.end.line,
      range.end.character,
    );
  }
}
