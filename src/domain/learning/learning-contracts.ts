export type LearningDifficulty = 'beginner' | 'intermediate' | 'advanced';

export interface LearningExplanation {
  readonly topic: string;
  readonly explanation: string;
  readonly example: string;
  readonly keyPoints: readonly string[];
}

export interface LearningExercise {
  readonly id: string;
  readonly prompt: string;
  readonly difficulty: LearningDifficulty;
  readonly starterCode?: string;
  readonly hints: readonly string[];
}

export interface ExerciseEvaluation {
  readonly exerciseId: string;
  readonly correct: boolean;
  readonly feedback: string;
  readonly nextStep?: string;
}
