// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import astro from 'eslint-plugin-astro';

export default tseslint.config(
  {
    ignores: ['**/node_modules/**', 'site/dist/**', 'site/.astro/**', 'api/*/dist/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...astro.configs['flat/recommended'],
  // Accessibility is a quality bar for this site (keyboard nav, semantics,
  // alt text), so the a11y rules are linted, not just audited at the end.
  ...astro.configs['flat/jsx-a11y-recommended'],
  {
    // Build-time scripts and tests run in Node, not the browser. Declared explicitly
    // rather than pulling in the `globals` package for one directory.
    files: ['scripts/**/*.mjs', 'infra/**/*.mjs', 'site/**/*.test.mjs', 'api/**/*.mjs'],
    languageOptions: {
      globals: {
        Buffer: 'readonly',
        console: 'readonly',
        process: 'readonly',
        Response: 'readonly',
        URL: 'readonly',
        structuredClone: 'readonly',
        __dirname: 'readonly',
      },
    },
  },
  {
    // CloudFront Functions are plain scripts: the runtime calls a top-level
    // handler() and accepts no module syntax, so the function is "unused" as
    // far as the file itself can tell.
    files: ['infra/**/functions/*.js'],
    languageOptions: { sourceType: 'script' },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^handler$' }],
      '@typescript-eslint/no-unused-vars': ['error', { varsIgnorePattern: '^handler$' }],
    },
  },
);
