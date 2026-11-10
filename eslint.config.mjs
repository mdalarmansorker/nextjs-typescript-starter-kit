import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';
import prettierConfig from 'eslint-config-prettier';
import simpleImportSortPlugin from 'eslint-plugin-simple-import-sort';

export default defineConfig([
  globalIgnores([
    '.next/**',
    'node_modules/**',
    'out/**',
    'build/**',
    'coverage/**',
    'test-results/**',
    'playwright-report/**',
    'next-env.d.ts',
  ]),

  js.configs.recommended,

  // Next.js: React, React Hooks, accessibility (jsx-a11y), imports and Core Web Vitals rules, plus
  // typescript-eslint's recommended rules.
  ...nextVitals,
  ...nextTypescript,

  // TypeScript
  {
    files: ['**/*.{ts,tsx,mts}'],
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
      'no-empty': ['error', { allowEmptyCatch: true }],
      '@typescript-eslint/no-empty-object-type': ['error', { allowInterfaces: 'with-single-extends' }],
    },
  },

  // JavaScript
  {
    files: ['**/*.{js,jsx,mjs}'],
    rules: {
      'no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
    },
  },

  // Import sorting (replaces eslint-plugin-import's `import/order`)
  {
    files: ['**/*.{ts,tsx,mts,js,jsx,mjs}'],
    plugins: {
      'simple-import-sort': simpleImportSortPlugin,
    },
    rules: {
      'import/order': 'off',
      'simple-import-sort/imports': [
        'error',
        {
          groups: [
            // Side effects
            ['^\\u0000'],

            // React & Next.js
            ['^react$', '^react-', '^next(?:/.*)?$'],

            // Third-party
            ['^@?\\w'],

            // Internal
            ['^@/utils(?:/.*)?$'],
            ['^@/lib(?:/.*)?$'],
            ['^@/services(?:/.*)?$'],
            ['^@/hooks(?:/.*)?$'],
            ['^@/components/icons(?:/.*)?$'],
            ['^@/components(?:/.*)?$'],
            ['^@/types(?:/.*)?$'],
            ['^@/constants(?:/.*)?$', '^@/data(?:/.*)?$', '^@/views(?:/.*)?$', '^@/(.*)$'],

            // Parent imports
            ['^\\.\\.(?!/?$)', '^\\.\\./?$'],

            // Relative imports
            ['^\\./(?=.*/)(?!/?$)', '^\\.(?!/?$)', '^\\./?$'],

            // Styles
            ['^.+\\.(?:css|scss)$'],
          ],
        },
      ],
      'simple-import-sort/exports': 'error',
    },
  },

  // Prettier last, so ESLint never fights it over formatting.
  prettierConfig,
]);
