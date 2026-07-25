export const DYSLEXIA_EXPLANATION_RULES = [
  'Use short sentences.',
  'Use plain language.',
  'Explain one idea at a time.',
  'State the purpose or problem first.',
  'State the next action second.',
  'Define necessary technical words.',
  'Use a small code example only when it helps.',
  'Keep the response concise.',
] as const;

export function dyslexiaTask(task: string): string {
  return [`Task: ${task}`, 'Reading rules:', ...DYSLEXIA_EXPLANATION_RULES].join('\n');
}
