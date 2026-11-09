import js from '@eslint/js';
import nextPlugin from '@next/eslint-plugin-next';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import simpleImportSortPlugin from 'eslint-plugin-simple-import-sort';
import prettierConfig from 'eslint-config-prettier';

export default [
  // Ignores
  {
    ignores: ['.next/**', 'node_modules/**', 'out/**', 'coverage/**', 'next-env.d.ts', 'eslint.config.mjs'],
  },

  // Base rules
  js.configs.recommended,
  ...tseslint.configs.recommended,

  // React & Next.js
  {
    files: ['**/*.{js,jsx,mjs,ts,tsx}'],

    plugins: {
      'react-hooks': reactHooks,
      '@next/next': nextPlugin,
    },

    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },

    rules: {
      // React
      ...reactHooks.configs.recommended.rules,
      'react-hooks/exhaustive-deps': 'off',

      // Next.js
      ...nextPlugin.configs.recommended.rules,
      '@next/next/no-img-element': 'off',
      '@next/next/no-page-custom-font': 'off',
    },
  },

  // TypeScript
  {
    files: ['**/*.{ts,tsx}'],
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
      'no-empty': [
        'error',
        {
          allowEmptyCatch: true,
        },
      ],
      '@typescript-eslint/no-empty-object-type': [
        'error',
        {
          allowInterfaces: 'with-single-extends',
        },
      ],
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

  // Import sorting
  {
    files: ['**/*.{ts,tsx,js,jsx,mjs}'],

    plugins: {
      'simple-import-sort': simpleImportSortPlugin,
    },

    rules: {
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

  // Prettier
  prettierConfig,
];
