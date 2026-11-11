/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Badge label fallback — mirrors the web renderer's `|| 'Badge'`.
 * An empty/unresolved label used to render a bare coloured pill with no text.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { renderHook } from '../support/renderMobile.ts';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { useInterpolatedField, withPlaceholder } from '../../components/renderer/useField.ts';

const badgeSource = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), '../../components/styles/interactive/Badge.tsx'),
    'utf8'
);

const section = (label) => ({ fields: { label: { content: label } } });

const readLabel = (sec, values = {}) => {
    const interpolated = renderHook(() => useInterpolatedField(sec, 'label', values));
    return withPlaceholder(interpolated, 'Badge');
};

test('Badge renders its label through the shared placeholder helper', () => {
    assert.match(badgeSource, /withPlaceholder\(useInterpolatedField\(section, 'label', values\), 'Badge'\)/);
});

test('resolved label renders as-is', () => {
    assert.equal(readLabel(section('Studienkoordination')), 'Studienkoordination');
});

test('interpolated label resolves against values', () => {
    assert.equal(
        readLabel(section('{{contact._department_label}}'), { 'contact._department_label': 'IT-Support' }),
        'IT-Support'
    );
});

test('empty label falls back instead of rendering an empty pill', () => {
    assert.equal(readLabel(section('')), 'Badge');
    assert.equal(readLabel(section('   ')), 'Badge');
});

test('missing label field falls back', () => {
    assert.equal(readLabel({ fields: {} }), 'Badge');
});
