/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Mobile consumes shared `parseFormRecordPrefill` + flatten helper — keep a
 * thin regression that the package export is wired for Metro/node tests.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
    flattenFormRecordPrefillValues,
    parseFormRecordPrefill,
} from '@selfhelp/shared';

test('shared parseFormRecordPrefill returns empty create state when section_data is missing', () => {
    assert.deepEqual(parseFormRecordPrefill({}), { recordId: null, values: {} });
});

test('shared parseFormRecordPrefill + flatten matches mobile form hydration', () => {
    const result = parseFormRecordPrefill({
        section_data: [
            { record_id: 42, id_languages: 1, name: 'Ada', role: 'Lead' },
        ],
        children: [{ name: { content: 'name' } }],
    });
    assert.equal(result.recordId, 42);
    assert.deepEqual(flattenFormRecordPrefillValues(result.values), {
        name: 'Ada',
        role: 'Lead',
    });
});

test('shared flatten prefers a public-language value for translatable fields', () => {
    const result = parseFormRecordPrefill({
        section_data: [
            { record_id: 9, id_languages: 1, bio: 'seed' },
            { record_id: 9, id_languages: 2, bio: 'Hallo' },
        ],
        children: [{ name: { content: 'bio' }, translatable: { content: '1' } }],
    });
    assert.equal(result.recordId, 9);
    assert.equal(flattenFormRecordPrefillValues(result.values, 2).bio, 'Hallo');
});
