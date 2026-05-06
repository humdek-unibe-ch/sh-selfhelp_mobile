/**
 * ESLint flat config (ESLint 9+).
 *
 * Uses `eslint-config-expo`, which already bundles
 * `@typescript-eslint`, `react`, and `react-native` rules.
 */
const expoConfig = require('eslint-config-expo/flat');

module.exports = [
    ...expoConfig,
    {
        ignores: [
            'node_modules/**',
            '.expo/**',
            'dist/**',
            'web-build/**',
            'android/**',
            'ios/**',
            'scripts/**',
            'docs/**',
        ],
    },
    {
        rules: {
            'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
        },
    },
];
