import type { AiContextItem } from '../../../domain/ai/ai-contracts';

const MAXIMUM_CONTEXT_ITEMS = 20;
const MAXIMUM_CONTEXT_CHARACTERS = 80_000;
const MAXIMUM_ITEM_CHARACTERS = 30_000;

export function composePromptContents(prompt: string, context: readonly AiContextItem[]): string {
  const blocks: string[] = [prompt.trim()];
  let remainingCharacters = MAXIMUM_CONTEXT_CHARACTERS;

  for (const [index, item] of context.slice(0, MAXIMUM_CONTEXT_ITEMS).entries()) {
    if (remainingCharacters <= 0) {
      break;
    }
    const content = item.content.slice(0, Math.min(MAXIMUM_ITEM_CHARACTERS, remainingCharacters));
    remainingCharacters -= content.length;
    blocks.push(
      [
        `<codespeak-context index="${String(index + 1)}" kind="${item.kind}">`,
        content,
        '</codespeak-context>',
      ].join('\n'),
    );
  }
  return blocks.join('\n\n');
}
