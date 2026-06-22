/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Unit tests for the layout sizing reader (`components/styles/layout/_sizing.ts`).
 *
 * Proves the cross-platform `shared_width`/`shared_height` (+ `center` min/max)
 * fields are read and routed through the SHARED mapper `parseDimensionToReactNative`
 * so a CMS px string becomes a unitless React Native number while percentages and
 * `auto` stay strings — the same fields the web renderer reads, mapped for RN.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { readSizingStyle, readConstraintStyle } from '../../components/styles/layout/_sizing.ts';

const section = (fields) => ({
    fields: Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, { content: v }])),
});

test('readSizingStyle maps px width/height to unitless numbers (RN-safe)', () => {
    const s = readSizingStyle(section({ shared_width: '320px', shared_height: '200px' }));
    assert.equal(s.width, 320);
    assert.equal(s.height, 200);
});

test('readSizingStyle keeps percentages and auto as strings', () => {
    const s = readSizingStyle(section({ shared_width: '50%', shared_height: 'auto' }));
    assert.equal(s.width, '50%');
    assert.equal(s.height, 'auto');
});

test('readSizingStyle omits unset/invalid dimensions', () => {
    const s = readSizingStyle(section({ shared_width: '' }));
    assert.equal('width' in s, false);
    assert.equal('height' in s, false);
});

test('readConstraintStyle maps the center min/max constraints', () => {
    const s = readConstraintStyle(
        section({ shared_miw: '100px', shared_maw: '90%', shared_mih: '50px', shared_mah: '300px' }),
    );
    assert.equal(s.minWidth, 100);
    assert.equal(s.maxWidth, '90%');
    assert.equal(s.minHeight, 50);
    assert.equal(s.maxHeight, 300);
});
