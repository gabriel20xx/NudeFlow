import js from '@eslint/js';
import globals from 'globals';

export default [
  js.configs.recommended,
  {
    files: ['src/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.es2022,
      }
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-console': 'off',
      'no-empty': ['error', { allowEmptyCatch: false }]
    }
  },
  {
    files: ['src/public/js/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: {
        ...globals.browser,
        ...globals.es2022,
        ApplicationUtilities: 'writable',
        ApplicationConfiguration: 'writable'
      }
    },
    rules: {
  'no-unused-vars': 'off',
  'no-console': 'off',
  'no-empty': 'off',
  'no-useless-escape': 'off'
    }
  }
];
