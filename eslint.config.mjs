// eslint.config.mjs
import nextPlugin from '@next/eslint-plugin-next';
import tsEslint from 'typescript-eslint';
import js from '@eslint/js';

export default [
  js.configs.recommended,
  ...tsEslint.configs.recommended,
  {
    plugins: {
      '@next/next': nextPlugin,
    },
    rules: {
      ...nextPlugin.configs['core-web-vitals'].rules,
      ...nextPlugin.configs.recommended.rules,
      // your overrides
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  {
    ignores: [
      '.next/**',
      'out/**',
      'build/**',
      'next-env.d.ts',
      // add any other patterns you want to ignore
    ],
  },
];