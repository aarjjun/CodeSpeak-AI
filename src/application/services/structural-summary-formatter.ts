import type { AccessibilityProfile } from '../../domain/accessibility/accessibility-profile';
import type {
  CodeStructure,
  FunctionStructure,
  StructuralSummary,
} from '../../domain/code-intelligence/code-structure';
import type { SourcePosition } from '../../domain/shared/source-location';

export class StructuralSummaryFormatter {
  public format(
    structure: CodeStructure,
    profile: AccessibilityProfile,
    position?: SourcePosition,
  ): StructuralSummary {
    const lines = [
      `Contains ${structure.imports.length.toString()} imports, ${structure.classes.length.toString()} classes, and ${structure.functions.length.toString()} top-level functions.`,
    ];
    const currentFunction = this.findCurrentFunction(structure, position);
    if (currentFunction !== undefined) {
      lines.push('', `Current function: ${currentFunction.name}.`);
      if (currentFunction.parameters.length > 0) {
        lines.push(
          `Parameters: ${currentFunction.parameters.map((parameter) => parameter.name).join(', ')}.`,
        );
      }
      lines.push(
        `Contains ${currentFunction.controlFlow.conditionalCount.toString()} conditional statements, ${currentFunction.controlFlow.loopCount.toString()} loops, and ${currentFunction.calls.length.toString()} function calls.`,
      );
      if (currentFunction.returnDescription !== undefined) {
        lines.push(currentFunction.returnDescription);
      }
    }

    if (profile.reading.verbosity !== 'brief') {
      const maximumItems = profile.reading.maximumItemsBeforeGrouping;
      const functions = structure.functions.slice(0, maximumItems);
      if (functions.length > 0) {
        lines.push('', 'Top-level functions:', ...functions.map((item) => `- ${item.name}`));
      }
      const classes = structure.classes.slice(0, maximumItems);
      if (classes.length > 0) {
        lines.push('', 'Classes:', ...classes.map((item) => `- ${item.name}`));
      }
    }

    if (structure.parseErrors.length > 0) {
      lines.push(
        '',
        `Parser notice: ${structure.parseErrors.length.toString()} syntax issues found.`,
      );
    }
    return { title: `Structure of ${this.fileName(structure.uri)}`, lines, structure };
  }

  private findCurrentFunction(
    structure: CodeStructure,
    position?: SourcePosition,
  ): FunctionStructure | undefined {
    if (position === undefined) {
      return undefined;
    }
    const functions = [
      ...structure.functions,
      ...structure.classes.flatMap((classItem) => classItem.methods),
    ];
    return functions.find(
      (item) =>
        this.compare(position, item.range.start) >= 0 &&
        this.compare(position, item.range.end) <= 0,
    );
  }

  private compare(left: SourcePosition, right: SourcePosition): number {
    return left.line === right.line ? left.character - right.character : left.line - right.line;
  }

  private fileName(uri: string): string {
    try {
      return decodeURIComponent(uri).replaceAll('\\', '/').split('/').at(-1) ?? uri;
    } catch {
      return uri;
    }
  }
}
