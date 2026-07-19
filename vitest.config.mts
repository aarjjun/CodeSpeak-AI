import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/unit/**/*.test.ts', 'test/accessibility/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/application/**/*.ts', 'src/domain/**/*.ts'],
      thresholds: {
        statements: 65,
        branches: 50,
        functions: 70,
        lines: 65,
      },
    },
  },
});
