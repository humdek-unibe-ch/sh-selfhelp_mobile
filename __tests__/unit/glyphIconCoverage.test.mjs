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
