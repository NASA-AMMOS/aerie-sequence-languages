/** @type {import('@typescript-eslint/utils').TSESLint.Linter.Config} */
module.exports = {
  env: {
    browser: true,
    es2017: true,
    node: true,
  },
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'prettier'],
  ignorePatterns: ['*.cjs', 'static/*.worker.js', 'static/*.worker.js.map', 'e2e-tests/data/*'],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  root: true,
  rules: {
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-inferrable-types': 'off',
    '@typescript-eslint/no-unused-vars': ['error', { ignoreRestSiblings: true, argsIgnorePattern: '^_' }],
    curly: 2,
    eqeqeq: ['error', 'always', { null: 'ignore' }],
    'no-undef': 'off',
  },
};
