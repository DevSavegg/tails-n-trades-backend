import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettierConfig from 'eslint-config-prettier';

export default tseslint.config(
  // Global Ignores
  {
    ignores: [
      'dist',
      'node_modules',
      '.husky',
      'coverage',
      '*.config.js',
      'src/drizzle',
      'scripts',
    ],
  },

  // Base Configurations
  js.configs.recommended,
  ...tseslint.configs.recommended,

  // Disable rules that conflict with Prettier
  prettierConfig,

  // Custom Rules
  {
    rules: {
      // --- JavaScript/Logic Rules ---
      eqeqeq: ['error', 'always'],
      curly: ['error', 'all'],
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],

      // --- TypeScript Specific Rules ---

      // Warn when 'any' type is used
      '@typescript-eslint/no-explicit-any': 'warn',

      // Allow unused variables if they start with an underscore
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],

      // Allow using functions before definition
      '@typescript-eslint/no-use-before-define': ['error', { functions: false, classes: false }],
    },
  }
);
