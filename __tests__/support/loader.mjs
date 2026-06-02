/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Module resolve hook for the mobile `node --test` suites (plan Slice 9).
 *
 * Node 22.18+ strips TypeScript types natively, so `.test.mjs` files can
 * import the app's `.ts` renderer helpers directly. Two things Node does
 * NOT do that the app's TS relies on, and that this hook fills in:
 *
 *   1. tsconfig path aliases (`@/...`, `@components/...`, `@styles/...`, …)
 *      → repo-root relative files.
 *   2. extensionless relative imports (`./spacing` → `./spacing.ts`), the
 *      bundler-resolution style Metro/Expo uses.
 *
 * Bare specifiers (`react`, `react-dom/server`, `@selfhelp/shared`) fall
 * through to Node's normal node_modules resolution. Type stripping itself
 * is handled by the Node runtime; this hook only maps specifiers to URLs.
 */

import { existsSync, statSync } from 'node:fs';
import { dirname, resolve as resolvePath } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));

// Mirror tsconfig.json#compilerOptions.paths. Longest prefix wins so
// `@components/` is matched before the catch-all `@/`.
const ALIASES = [
    ['@components/', 'components/'],
    ['@hooks/', 'hooks/'],
    ['@providers/', 'providers/'],
    ['@services/', 'services/'],
    ['@stores/', 'stores/'],
    ['@types/', 'types/'],
    ['@styles/', 'styles/'],
    ['@config/', 'config/'],
    ['@constants/', 'constants/'],
    ['@/', ''],
];

const EXTENSIONS = ['.ts', '.tsx', '.mts', '.mjs', '.js', '.json'];

function isFile(p) {
    return existsSync(p) && statSync(p).isFile();
}

function resolveWithExtensions(basePath) {
    if (isFile(basePath)) return pathToFileURL(basePath).href;
    for (const ext of EXTENSIONS) {
        if (isFile(basePath + ext)) return pathToFileURL(basePath + ext).href;
    }
    for (const ext of EXTENSIONS) {
        const indexFile = resolvePath(basePath, `index${ext}`);
        if (isFile(indexFile)) return pathToFileURL(indexFile).href;
    }
    return null;
}

export async function resolve(specifier, context, nextResolve) {
    for (const [prefix, target] of ALIASES) {
        if (specifier.startsWith(prefix)) {
            const rest = specifier.slice(prefix.length);
            const url = resolveWithExtensions(resolvePath(ROOT, target, rest));
            if (url) return { url, shortCircuit: true };
        }
    }

    if ((specifier.startsWith('./') || specifier.startsWith('../')) && context.parentURL) {
        const parentPath = fileURLToPath(context.parentURL);
        const url = resolveWithExtensions(resolvePath(dirname(parentPath), specifier));
        if (url) return { url, shortCircuit: true };
    }

    return nextResolve(specifier, context);
}
