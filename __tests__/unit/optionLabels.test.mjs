/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { resolveOptions } from '@selfhelp/shared';

test('shared option resolver preserves translated and legacy labels', () => {
    assert.deepEqual(
        resolveOptions(
            [
                { value: 'release', text: 'Legacy release' },
                { value: 'notice', label: 'Legacy notice' },
                { value: 'feature' },
            ],
            { release: 'Freigabe' },
            { feature: 'Feature' },
        ),
        [
            { value: 'release', label: 'Freigabe' },
            { value: 'notice', label: 'Legacy notice' },
            { value: 'feature', label: 'Feature' },
        ],
    );
});

test('all mobile option renderers consume the shared resolver without local copies', () => {
    for (const file of ['Select.tsx', 'Radio.tsx', 'SegmentedControl.tsx']) {
        const source = readFileSync(
            new URL(`../../components/styles/forms/${file}`, import.meta.url),
            'utf8',
        );
        assert.match(source, /resolveOptions/);
        assert.match(source, /@selfhelp\/shared/);
        assert.doesNotMatch(source, /function resolveOptions/);
    }
});
