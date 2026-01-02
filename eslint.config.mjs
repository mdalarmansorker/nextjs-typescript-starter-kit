import path from 'path'
import { fileURLToPath } from 'url'
import { FlatCompat } from '@eslint/eslintrc'
import tsParser from '@typescript-eslint/parser'
import tsPlugin from '@typescript-eslint/eslint-plugin'
import reactPlugin from 'eslint-plugin-react'
import jsxA11yPlugin from 'eslint-plugin-jsx-a11y'

// Get __dirname in ESM
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// FlatCompat for legacy ESLint config support
const compat = new FlatCompat({ baseDirectory: __dirname })

export default [
  // ⛔ Ignore config & build files
  {
    ignores: [
      'eslint.config.mjs',
      'next-env.d.ts',
      '.next/**',
      'node_modules/**',
    ],
  },

  // 🔹 TypeScript files with type checking
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: __dirname,
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      react: reactPlugin,
      'jsx-a11y': jsxA11yPlugin,
    },
  },

  // 🔹 JavaScript/JSX files without type checking
  {
    files: ['**/*.{js,jsx,mjs}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
        // No project reference for JS files
      },
    },
    plugins: {
      react: reactPlugin,
      'jsx-a11y': jsxA11yPlugin,
    },
  },

  // 🔹 Legacy config compatibility (FlatCompat)
  ...compat.config({
    extends: [
      'prettier',
    ],
    rules: {
      // React & JSX Accessibility
      'jsx-a11y/alt-text': 'off',
      'react/display-name': 'off',
      'react/no-children-prop': 'off',
      '@next/next/no-img-element': 'off',
      '@next/next/no-page-custom-font': 'off',

      // Disable all import rules
      'import/order': 'off',
      'import/newline-after-import': 'off',
      'import/no-unresolved': 'off',

      // Comment & padding rules
      'lines-around-comment': [
        'error',
        {
          beforeBlockComment: true,
          beforeLineComment: true,
          allowBlockStart: true,
          allowObjectStart: true,
          allowArrayStart: true,
        },
      ],

      'padding-line-between-statements': [
        'error',
        { blankLine: 'any', prev: 'export', next: 'export' },
        { blankLine: 'always', prev: ['const', 'let', 'var'], next: '*' },
        { blankLine: 'any', prev: ['const', 'let', 'var'], next: ['const', 'let', 'var'] },
        { blankLine: 'always', prev: '*', next: ['function', 'multiline-const', 'multiline-block-like'] },
        { blankLine: 'always', prev: ['function', 'multiline-const', 'multiline-block-like'], next: '*' },
      ],

      'newline-before-return': 'error',
    },
    settings: {
      react: { version: 'detect' },
    },
  }),
]
