/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Smoke test: STYLE_REGISTRY ↔ mobile `styleImpls` parity.
 *
 * Runs under `node --test` (Node 20+ built-in runner — no Jest dep).
 *
 * Why this exists even though TypeScript enforces the same constraint
 * at compile time:
 *   - `tsc --noEmit` is the gate, but a developer can break the gate
 *     temporarily by `// @ts-expect-error` or `as any`. This test
 *     catches that at CI / pre-commit time too.
 *   - Catches missing imports (a file exists, exports the right name,
 *     but the index.ts forgets to add it to the map).
 *
 * One sub-test per registry category — the audit asked for category
 * granularity, not per-style granularity.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');

const extractStyleNames = () => {
    const registryPath = resolve(ROOT, '..', 'sh-selfhelp_shared', 'src', 'registry', 'styles.registry.ts');
    const indexPath = resolve(ROOT, 'components', 'styles', 'index.ts');

    const registrySource = readFileSync(registryPath, 'utf-8');
    const implSource = readFileSync(indexPath, 'utf-8');

    // Match keys inside `STYLE_REGISTRY = { ... }` — anything before `:`.
    const registryRegex = /^\s+(?:'([^']+)'|([a-zA-Z][a-zA-Z0-9_-]*)):\s*\{/gm;
    const registryKeys = new Set();
    for (const m of registrySource.matchAll(registryRegex)) {
        const key = m[1] ?? m[2];
        if (key && !key.startsWith('description') && !key.startsWith('category')) {
            registryKeys.add(key);
        }
    }

    // Inside `styleImpls: TStyleImplMap = { ... }`. Same pattern.
    const implRegex = /^\s+(?:'([^']+)'|([a-zA-Z][a-zA-Z0-9_-]*)):\s*[A-Z]/gm;
    const implMatch = implSource.match(/styleImpls:\s*TStyleImplMap\s*=\s*\{([\s\S]*?)\n\};/);
    const implBlock = implMatch ? implMatch[1] : '';
    const implKeys = new Set();
    for (const m of implBlock.matchAll(implRegex)) {
        const key = m[1] ?? m[2];
        if (key) implKeys.add(key);
    }

    return { registryKeys, implKeys };
};

const KNOWN_CATEGORIES = ['auth', 'layout', 'typography', 'media', 'interactive', 'forms', 'composite'];

test('every STYLE_REGISTRY key has a mobile impl', () => {
    const { registryKeys, implKeys } = extractStyleNames();
    const missing = [...registryKeys].filter((k) => !implKeys.has(k));
    assert.deepEqual(missing, [], `Mobile is missing impls for: ${missing.join(', ')}`);
});

test('mobile styleImpls does not introduce unregistered keys', () => {
    const { registryKeys, implKeys } = extractStyleNames();
    const extra = [...implKeys].filter((k) => !registryKeys.has(k));
    assert.deepEqual(extra, [], `Mobile has impls without registry entries: ${extra.join(', ')}`);
});

for (const category of KNOWN_CATEGORIES) {
    test(`category "${category}" — every registered style has an impl`, () => {
        const registryPath = resolve(ROOT, '..', 'sh-selfhelp_shared', 'src', 'registry', 'styles.registry.ts');
        const source = readFileSync(registryPath, 'utf-8');

        // Match { ... category: 'X' ... } blocks
        const blockRegex = new RegExp(
            `^\\s+(?:'([^']+)'|([a-zA-Z][a-zA-Z0-9_-]*)):\\s*\\{[^}]*category:\\s*'${category}'`,
            'gm'
        );
        const styles = [];
        for (const m of source.matchAll(blockRegex)) {
            const key = m[1] ?? m[2];
            if (key) styles.push(key);
        }

        assert.ok(styles.length > 0, `No styles registered for category "${category}"`);

        const { implKeys } = extractStyleNames();
        const missing = styles.filter((s) => !implKeys.has(s));
        assert.deepEqual(missing, [], `Category "${category}" missing impls: ${missing.join(', ')}`);
    });
}
