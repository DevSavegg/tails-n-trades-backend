export default {
  extends: ['@commitlint/config-conventional'],

  /* * CUSTOM RULES
   * Format: [Level, 'always' | 'never', Value]
   * Level: 0 = disable, 1 = warning, 2 = error
   */
  rules: {
    // TYPE RULES
    // ----------------------------------------------------------------------
    'type-enum': [
      2,
      'always',
      [
        'feat', // New feature
        'fix', // Bug fix
        'docs', // Documentation
        'style', // Formatting (missing semi-colons, etc)
        'refactor', // Code change that neither fixes a bug nor adds a feature
        'perf', // Performance improvement
        'test', // Adding missing tests
        'build', // Build system or external dependencies
        'ci', // CI configuration files and scripts
        'chore', // Other changes that don't modify src or test files
        'revert', // Reverts a previous commit
      ],
    ],
    // The type must be lowercase
    'type-case': [2, 'always', 'lower-case'],
    // The type cannot be empty
    'type-empty': [2, 'never'],

    // SCOPE RULES
    // ----------------------------------------------------------------------
    'scope-case': [2, 'always', 'lower-case'],

    // SUBJECT RULES
    // ----------------------------------------------------------------------
    // Subject cannot be empty
    'subject-empty': [2, 'never'],
    // Subject must NOT end with a period '.'
    'subject-full-stop': [2, 'never', '.'],
    // Subject must be lowercase
    'subject-case': [2, 'never', ['sentence-case', 'start-case', 'pascal-case', 'upper-case']],

    // BODY & FOOTER RULES
    // ----------------------------------------------------------------------
    // There must be a blank line between the subject and the body
    'body-leading-blank': [1, 'always'],
    // Lines in the body should not be too long
    'body-max-line-length': [2, 'always', 100],
    // There must be a blank line between the body and the footer
    'footer-leading-blank': [1, 'always'],
  },
};
