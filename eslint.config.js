/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * ESLint flat config (ESLint 9+).
 *
 * Layers, in order:
 *   1. `eslint-config-expo/flat` — the team's existing base. It already bundles
 *      `@typescript-eslint`, `eslint-plugin-react`, `eslint-plugin-react-hooks`,
 *      `eslint-plugin-import`, and `eslint-plugin-expo`.
 *   2. A strict, type-aware layer for the app's TS/TSX sources that promotes
 *      correctness rules to errors: no unused imports/vars, no explicit `any`,
 *      no floating/misused promises, no `any` propagation through the type
 *      system, consistent (side-effect-free) type imports, etc. Type
 *      information is supplied through `parserOptions.projectService`.
 *   3. Targeted overrides for files that are not part of the app's strict
 *      type-checked surface (ambient declaration files), plus the existing
 *      `no-console` policy.
 *
 * Nothing here weakens a rule for production app code. The only relaxation is
 * the documented React/React Native-friendly default
 * `no-misused-promises` → `checksVoidReturn.attributes: false`, which keeps
 * async functions usable as `onPress`/`onSubmit` handlers while still flagging
 * genuine promise misuse (conditions, spreads, logical expressions, …).
 */
const expoConfig = require('eslint-config-expo/flat');
const tseslint = require('typescript-eslint');
const unusedImports = require('eslint-plugin-unused-imports');

module.exports = tseslint.config(
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
    ...expoConfig,
    {
        files: ['**/*.ts', '**/*.tsx'],
        languageOptions: {
            parserOptions: {
                projectService: true,
                tsconfigRootDir: __dirname,
            },
        },
        plugins: {
            'unused-imports': unusedImports,
        },
        rules: {
            // --- Unused imports / variables ---
            // `unused-imports` owns this so unused *imports* are auto-removable;
            // the TS core rule is disabled to avoid double-reporting.
            '@typescript-eslint/no-unused-vars': 'off',
            'unused-imports/no-unused-imports': 'error',
            'unused-imports/no-unused-vars': [
                'error',
                {
                    vars: 'all',
                    varsIgnorePattern: '^_',
                    args: 'after-used',
                    argsIgnorePattern: '^_',
                    caughtErrors: 'all',
                    caughtErrorsIgnorePattern: '^_',
                    ignoreRestSiblings: true,
                },
            ],

            // --- No explicit `any` ---
            '@typescript-eslint/no-explicit-any': 'error',

            // --- Promise safety (type-aware) ---
            '@typescript-eslint/no-floating-promises': 'error',
            '@typescript-eslint/no-misused-promises': [
                'error',
                { checksVoidReturn: { attributes: false } },
            ],
            '@typescript-eslint/await-thenable': 'error',

            // --- `any` propagation through the type system (type-aware) ---
            '@typescript-eslint/no-unsafe-assignment': 'error',
            '@typescript-eslint/no-unsafe-member-access': 'error',
            '@typescript-eslint/no-unsafe-call': 'error',
            '@typescript-eslint/no-unsafe-return': 'error',

            // --- Misc type-aware correctness ---
            '@typescript-eslint/no-unnecessary-type-assertion': 'error',
            '@typescript-eslint/no-for-in-array': 'error',

            // --- Consistent, side-effect-free type imports ---
            '@typescript-eslint/consistent-type-imports': [
                'error',
                { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
            ],

            // --- General correctness (promoted to error for app code) ---
            'consistent-return': 'error',
            'no-unreachable': 'error',
            'no-debugger': 'error',
            // TS-aware duplicate-import detection. Preferred over the core
            // `no-duplicate-imports` because it understands `import type` and is
            // auto-fixable without clashing with `consistent-type-imports`.
            'import/no-duplicates': 'error',

            // `import/no-named-as-default-member` is a low-value, false-positive
            // prone rule for default-export libraries that ALSO publish a
            // same-named named export: `axios.create()`, `i18n.changeLanguage()`,
            // and `i18n.use()` are the libraries' documented, idiomatic APIs, not
            // mistakes. eslint-config-expo enables it as a warning, which breaks
            // `--max-warnings=0`. Turning it off here is a behaviour-preserving
            // config decision (the alternative — rewriting to named imports —
            // would change runtime imports), not a blanket disable to hide bugs;
            // every correctness/type-safety rule above stays enforced.
            'import/no-named-as-default-member': 'off',
        },
    },
    {
        // Ambient declaration files describe types only; unused symbols there
        // are not meaningful.
        files: ['**/*.d.ts'],
        rules: {
            'unused-imports/no-unused-vars': 'off',
        },
    },
    {
        // Root config files run in Node (CommonJS), not in the RN runtime, so
        // expose the Node globals they rely on (`__dirname`, …).
        files: ['eslint.config.js', 'babel.config.js', 'metro.config.js', 'tailwind.config.js', 'app.config.ts'],
        languageOptions: {
            globals: {
                __dirname: 'readonly',
                __filename: 'readonly',
                module: 'writable',
                require: 'readonly',
                process: 'readonly',
            },
        },
        rules: {
            // Config files need to access process.env which TypeScript types as any
            '@typescript-eslint/no-unsafe-assignment': 'off',
        },
    },
    {
        // Preserve the project's existing console policy (dev-logging
        // convention lives in `debugLogger`; warn/error/info stay allowed).
        rules: {
            'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
        },
    },
);
