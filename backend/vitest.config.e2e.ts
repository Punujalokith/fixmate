import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';
import { TEST_ENV } from './test/test-env.js';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['test/**/*.e2e-spec.ts'],
    env: TEST_ENV,
    globalSetup: ['./test/global-setup.ts'],
    // Files share one database, so run them one after another.
    fileParallelism: false,
    // Booting the full app + database connection can take >10s on a cold start.
    hookTimeout: 60_000,
    testTimeout: 30_000,
  },
});
