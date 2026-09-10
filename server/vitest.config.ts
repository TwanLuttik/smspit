import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['**/dist/**', '**/node_modules/**', '**/vitest.config.*', 'src/index.ts'],
      thresholds: {
        lines: 82,
        functions: 85,
        branches: 62,
        statements: 82,
      },
    },
  },
});
