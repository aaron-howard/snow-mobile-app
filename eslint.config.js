// Flat config for ESLint v9. The shareable `expo` and `prettier` configs are
// still distributed in legacy (eslintrc) format, so they are bridged with
// FlatCompat. Project-specific rules mirror the previous .eslintrc.js.
const { FlatCompat } = require('@eslint/eslintrc');
const js = require('@eslint/js');

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

module.exports = [
  {
    ignores: [
      'node_modules/**',
      '.expo/**',
      'android/**',
      'ios/**',
      'dist/**',
      'coverage/**',
      // Tooling/config files that are not part of the TS program.
      'babel.config.js',
      'jest.config.js',
      'eslint.config.js',
    ],
  },
  ...compat.extends('expo', 'prettier'),
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/consistent-type-imports': 'error',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
];
