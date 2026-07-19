import { describe, expect, it, vi } from 'vitest';
import { GoToLine } from '../../../src/application/use-cases/workspace/go-to-line';
import type { EditorGateway } from '../../../src/application/ports/platform/editor-gateway';
import type { UserInterfaceGateway } from '../../../src/application/ports/platform/user-interface-gateway';

function createEditor(content = 'one\ntwo\nthree'): {
  readonly editor: EditorGateway;
  readonly revealPosition: ReturnType<typeof vi.fn>;
} {
  const revealPosition = vi.fn().mockResolvedValue(undefined);
  return {
    revealPosition,
    editor: {
      getActiveDocument: () =>
        Promise.resolve({
          uri: 'file:///example.ts',
          languageId: 'typescript',
          version: 1,
          content,
        }),
      getSelection: () => Promise.resolve(undefined),
      insertText: () => Promise.resolve(true),
      applyEdit: () => Promise.resolve(true),
      showPreview: () => Promise.resolve(),
      openDocument: () => Promise.resolve(true),
      revealPosition,
      undo: () => Promise.resolve(),
      redo: () => Promise.resolve(),
    },
  };
}

function createUserInterface(): {
  readonly userInterface: UserInterfaceGateway;
  readonly announce: ReturnType<typeof vi.fn>;
  readonly showWarning: ReturnType<typeof vi.fn>;
} {
  const announce = vi.fn().mockResolvedValue(undefined);
  const showWarning = vi.fn().mockResolvedValue(undefined);
  return {
    announce,
    showWarning,
    userInterface: {
      announce,
      showInformation: () => Promise.resolve(),
      showWarning,
      showError: () => Promise.resolve(),
      choose: () => Promise.resolve(undefined),
      requestText: () => Promise.resolve(undefined),
      confirm: () => Promise.resolve(false),
      showProgress: (_title, operation) => operation(new AbortController().signal),
    },
  };
}

describe('GoToLine', () => {
  it('converts the accessible one-based line number to an editor position', async () => {
    const { editor, revealPosition } = createEditor();
    const { userInterface, announce } = createUserInterface();
    const useCase = new GoToLine(editor, userInterface);

    await useCase.execute(2);

    expect(revealPosition).toHaveBeenCalledWith({ line: 1, character: 0 });
    expect(announce).toHaveBeenCalledWith('Line 2.');
  });

  it('rejects an out-of-range line without moving the cursor', async () => {
    const { editor, revealPosition } = createEditor();
    const { userInterface, showWarning } = createUserInterface();
    const useCase = new GoToLine(editor, userInterface);

    await useCase.execute(10);

    expect(revealPosition).not.toHaveBeenCalled();
    expect(showWarning).toHaveBeenCalledWith('Enter a whole number from 1 to 3.');
  });
});
