/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Fails when app source still compares against bare language id 1 or locale
 * `all`. Clients must import `LANGUAGE_INDEPENDENT_*` / `isLanguageIndependent`
 * from `@selfhelp/shared`.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, '../..');

/** App source trees (no `src/`); skip tests, build output and tooling. */
const SOURCE_ROOTS = [
    'app',
    'components',
    'config',
    'hooks',
    'native',
    'providers',
    'services',
    'stores',
    'styles',
];

const FORBIDDEN = [
    /language_id\s*===\s*1\b/,
    /language_id\s*!==\s*1\b/,
    /languageId\s*===\s*1\b/,
    /language_id\s*>\s*1\b/,
    /locale\s*===\s*['"]all['"]/,
];

function listSourceFiles(dir) {
    const out = [];
    for (const name of readdirSync(dir)) {
        const full = join(dir, name);
        const st = statSync(full);
        if (st.isDirectory()) {
            if (name === '__tests__' || name === 'node_modules' || name === 'dist') {
                continue;
            }
            out.push(...listSourceFiles(full));
            continue;
        }
        if (/\.(ts|tsx|js|mjs|cjs)$/.test(name) && !name.endsWith('.d.ts')) {
            out.push(full);
        }
    }
    return out;
}

test('app source uses LANGUAGE_INDEPENDENT_* / isLanguageIndependent instead of bare 1 or locale all', () => {
    const hits = [];
    for (const rootName of SOURCE_ROOTS) {
        const root = join(ROOT, rootName);
        let st;
        try {
            st = statSync(root);
        } catch {
            continue;
        }
        if (!st.isDirectory()) {
            continue;
        }
        for (const file of listSourceFiles(root)) {
            const rel = relative(ROOT, file).split(sep).join('/');
            const text = readFileSync(file, 'utf8');
            for (const pattern of FORBIDDEN) {
                if (pattern.test(text)) {
                    hits.push(`${rel} matches ${pattern}`);
                }
            }
        }
    }
    assert.deepEqual(hits, []);
});
