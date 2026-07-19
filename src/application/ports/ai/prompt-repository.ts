import type { PromptVariables } from '../../../domain/ai/ai-contracts';

export interface PromptTemplate {
  readonly id: string;
  readonly version: number;
  render(input: PromptVariables): string;
}

export interface PromptRepository {
  get(promptId: string): Promise<PromptTemplate | undefined>;
}
