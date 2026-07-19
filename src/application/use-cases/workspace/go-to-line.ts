import type { EditorGateway } from '../../ports/platform/editor-gateway';
import type { UserInterfaceGateway } from '../../ports/platform/user-interface-gateway';

export class GoToLine {
  public constructor(
    private readonly editor: EditorGateway,
    private readonly userInterface: UserInterfaceGateway,
  ) {}

  public async execute(initialLine?: string | number): Promise<void> {
    const document = await this.editor.getActiveDocument();
    if (document === undefined) {
      await this.userInterface.showWarning('Open a file before navigating to a line.');
      return;
    }

    const lineCount = document.content.split(/\r?\n/u).length;
    const input =
      initialLine?.toString() ??
      (await this.userInterface.requestText('Go to line', {
        placeHolder: `Enter a line number from 1 to ${lineCount.toString()}`,
      }));
    if (input === undefined) {
      return;
    }

    const lineNumber = Number(input.trim());
    if (!Number.isInteger(lineNumber) || lineNumber < 1 || lineNumber > lineCount) {
      await this.userInterface.showWarning(
        `Enter a whole number from 1 to ${lineCount.toString()}.`,
      );
      return;
    }

    await this.editor.revealPosition({ line: lineNumber - 1, character: 0 });
    await this.userInterface.announce(`Line ${lineNumber.toString()}.`);
  }
}
