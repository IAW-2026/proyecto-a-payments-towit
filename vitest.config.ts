import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
  // Habilitamos la resolución nativa de TypeScript paths
  resolve: {
    tsconfigPaths: true,
  }
});