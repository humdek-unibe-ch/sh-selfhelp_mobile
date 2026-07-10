/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * CI guard: every curated `MOBILE_ICON_SET` name from `@selfhelp/shared` must
 * appear as a key in the static Metro `GLYPH_ICONS` registry source. Dynamic
 * lucide imports are incompatible with Metro bundling.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { MOBILE_ICON_NAMES } from '@selfhelp/shared';

const here = dirname(fileURLToPath(import.meta.url));
const glyphSource = readFileSync(
    join(here, '../../components/ui/glyphIcon.tsx'),
    'utf8',
);

/** Keys listed in the `GLYPH_ICONS = { ... }` object literal. */
function parseGlyphIconKeys(source) {
    const match = source.match(/export const GLYPH_ICONS[^=]*=\s*\{([^}]+)\}/s);
    assert.ok(match, 'GLYPH_ICONS object not found in glyphIcon.tsx');
    return [...match[1].matchAll(/^\s*([A-Z][A-Za-z0-9]*)\s*,?\s*$/gm)].map((m) => m[1]);
}

test('GLYPH_ICONS covers every MOBILE_ICON_SET name', () => {
    const keys = new Set(parseGlyphIconKeys(glyphSource));
    const missing = MOBILE_ICON_NAMES.filter((name) => !keys.has(name));
    assert.deepEqual(
        missing,
        [],
        `GLYPH_ICONS is missing shared MOBILE_ICON_SET names: ${missing.join(', ')}`,
    );
});

/** TABLER_ALIASES map: Tabler stripped name → lucide GLYPH_ICONS key. */
function parseTablerAliasTargets(source) {
    const match = source.match(/const TABLER_ALIASES[^=]*=\s*\{([^}]+)\}/s);
    assert.ok(match, 'TABLER_ALIASES object not found in glyphIcon.tsx');
    return [...match[1].matchAll(/^\s*[A-Za-z0-9]+\s*:\s*'([A-Za-z0-9]+)'/gm)].map(
        (m) => m[1],
    );
}

test('TABLER_ALIASES targets are valid GLYPH_ICONS keys (no unsupported mapping)', () => {
    const keys = new Set(parseGlyphIconKeys(glyphSource));
    const targets = parseTablerAliasTargets(glyphSource);
    const invalid = targets.filter((name) => !keys.has(name));
    assert.deepEqual(
        invalid,
        [],
        `TABLER_ALIASES maps to missing GLYPH_ICONS keys: ${invalid.join(', ')}`,
    );
});

test('GLYPH_ICONS shorthand keys are imported (static Metro registry)', () => {
    const keys = parseGlyphIconKeys(glyphSource);
    const namedImport = glyphSource.match(
        /import\s*\{([^}]+)\}\s*from\s*'lucide-react-native'/,
    );
    assert.ok(namedImport, 'lucide-react-native named import not found');
    const imported = new Set(
        namedImport[1]
            .split(',')
            .map((part) => part.trim())
            .filter(Boolean)
            .map((part) => part.split(/\s+as\s+/).pop().trim()),
    );
    const missingImports = keys.filter((name) => !imported.has(name));
    assert.deepEqual(
        missingImports,
        [],
        `GLYPH_ICONS keys lack lucide imports (unsupported mapping): ${missingImports.join(', ')}`,
    );
});
