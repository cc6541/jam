import { defineConfig } from 'vitest/config';

// DoD phase 3 : couverture ≥ 90 % sur engine-screw.
export default defineConfig({
  test: {
    coverage: {
      enabled: true,
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/types.ts', 'src/index.ts'],
      reporter: ['text-summary'],
      thresholds: { lines: 90, functions: 90, branches: 90, statements: 90 },
    },
  },
});
