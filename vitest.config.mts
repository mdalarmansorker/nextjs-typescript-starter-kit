import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const root = new URL('./', import.meta.url).pathname;

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@/': root,
    },
  },
  test: {
    // Every test starts from fresh mocks, so no test depends on what an earlier one left behind.
    restoreMocks: true,
    unstubEnvs: true,
    unstubGlobals: true,
    setupFiles: ['./vitest.setup.ts'],
    projects: [
      {
        // Server code, utilities and route handlers: `*.test.ts`
        extends: true,
        test: {
          name: 'node',
          environment: 'node',
          include: ['**/*.test.ts'],
          exclude: ['node_modules/**', '.next/**', 'e2e/**'],
        },
      },
      {
        // Components, hooks and other browser code: `*.test.tsx`
        extends: true,
        test: {
          name: 'dom',
          environment: 'jsdom',
          include: ['**/*.test.tsx'],
          exclude: ['node_modules/**', '.next/**', 'e2e/**'],
        },
      },
    ],
    coverage: {
      provider: 'v8',
      include: ['app/**', 'lib/**', 'services/**', 'utils/**', 'views/**', 'proxy.ts', 'instrumentation.ts'],
      // Pages, layouts and metadata routes are covered by the e2e tests instead.
      exclude: [
        '**/*.test.{ts,tsx}',
        'app/**/{page,layout}.tsx',
        'app/{robots,sitemap}.ts',
        'app/opengraph-image.tsx',
        '**/*.css',
      ],
      reporter: ['text', 'html', 'lcov'],
      // CI fails when coverage drops below these. Raise them as the app grows; don't lower them to pass.
      thresholds: {
        lines: 80,
        statements: 80,
        functions: 80,
        branches: 75,
      },
    },
  },
});
