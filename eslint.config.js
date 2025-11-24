// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
// Do not manually re-register import plugin; expo config already includes it.

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
    settings: {
      // Silence unresolved warnings for Expo native modules bundled by the runtime
      'import/core-modules': ['expo-document-picker', 'expo-file-system'],
    },
    rules: {
      // Disable problematic namespace rule (no 'allow' option exists)
      'import/namespace': 'off',
      // Keep unresolved checking but ignore the expo native shims
      'import/no-unresolved': ['error', { ignore: ['expo-document-picker', 'expo-file-system'] }],
    },
  },
]);
