import js from '@eslint/js'
import globals from 'globals'
import { defineConfig, globalIgnores } from 'eslint/config'

// The server, scripts and tests run on Node; the app's separate script files run in the browser. index.html's
// inline script and the built growth.js aren't linted here (the tests parse and run them instead).
export default defineConfig([
  globalIgnores(['node_modules', 'public/chorecast/growth.js', 'public/chorecast/vendor', 'chorecast-growth']),
  {
    files: ['server/**/*.js', 'scripts/**/*.mjs', 'tests/**/*.mjs', 'eslint.config.js'],
    extends: [js.configs.recommended],
    languageOptions: { ecmaVersion: 2024, sourceType: 'module', globals: globals.node },
    rules: { 'no-unused-vars': ['error', { args: 'none', caughtErrors: 'none' }], 'no-empty': ['error', { allowEmptyCatch: true }] },
  },
  {
    files: ['public/**/*.js'],
    extends: [js.configs.recommended],
    languageOptions: { ecmaVersion: 2024, sourceType: 'script', globals: { ...globals.browser, THREE: 'readonly' } },
    rules: { 'no-unused-vars': ['error', { args: 'none', caughtErrors: 'none' }], 'no-empty': ['error', { allowEmptyCatch: true }] },
  },
  { files: ['public/sw.js'], languageOptions: { globals: { ...globals.browser, ...globals.serviceworker } } },
])
