import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    // Booting the full app + database connection can take >10s on a cold start.
    hookTimeout: 60_000,
    testTimeout: 30_000,
  },
});
