import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['**/dist/**', '**/coverage/**', '**/node_modules/**', '**/.turbo/**'] },
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['**/*.test.ts'],
    rules: { '@typescript-eslint/no-non-null-assertion': 'off' },
  },
  {
    // DoD phase 4 : le rendu affiche et anime, il ne joue pas (l'app appelle le moteur).
    files: ['packages/render-pixi/src/**/*.ts'],
    ignores: ['**/*.test.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@jam/engine-screw',
              importNames: ['engine', 'solve', 'generateLevel', 'Rng'],
              message: 'Aucune logique de jeu dans le rendu : il reçoit des StepResult.',
            },
          ],
        },
      ],
    },
  },
  {
    // Invariant 4 : moteurs purs et déterministes.
    files: ['packages/engine-*/src/**/*.ts'],
    ignores: ['**/*.test.ts'],
    rules: {
      'no-restricted-globals': ['error', 'Date', 'performance', 'window', 'document', 'setTimeout', 'setInterval'],
      'no-restricted-properties': ['error', { object: 'Math', property: 'random', message: 'RNG seedé uniquement.' }],
      'no-restricted-imports': ['error', { patterns: ['react', 'react-*', 'pixi.js', '@pixi/*', '@jam/*'] }],
    },
  },
);
