export interface LineRange {
  readonly startLine: number;
  readonly endLine: number;
}

export function findIndentationBlock(lines: readonly string[], activeLine: number): LineRange {
  if (lines.length === 0) return { startLine: 0, endLine: 0 };
  const safeLine = Math.min(lines.length - 1, Math.max(0, activeLine));
  const activeIndent = indentation(lines[safeLine] ?? '');
  let startLine = safeLine;
  let endLine = safeLine;

  for (let line = safeLine - 1; line >= 0; line -= 1) {
    const text = lines[line] ?? '';
    if (text.trim().length === 0) continue;
    const currentIndent = indentation(text);
    if (currentIndent < activeIndent) {
      startLine = line;
      break;
    }
    startLine = line;
  }

  for (let line = safeLine + 1; line < lines.length; line += 1) {
    const text = lines[line] ?? '';
    if (text.trim().length === 0) {
      endLine = line;
      continue;
    }
    if (indentation(text) < activeIndent) break;
    endLine = line;
  }

  return { startLine, endLine };
}

function indentation(value: string): number {
  let width = 0;
  for (const character of value) {
    if (character === ' ') width += 1;
    else if (character === '\t') width += 4;
    else break;
  }
  return width;
}
