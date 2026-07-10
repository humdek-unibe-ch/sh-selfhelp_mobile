/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { parseFormRecordPrefill } from '../../components/styles/forms/formRecordPrefill.ts';

test('parseFormRecordPrefill returns empty create state when section_data is missing', () => {
    assert.deepEqual(parseFormRecordPrefill({}), { recordId: null, values: {} });
});

test('parseFormRecordPrefill flattens the first hydrated record into string values', () => {
    const result = parseFormRecordPrefill({
        section_data: [
            { record_id: 42, id_languages: 1, name: 'Ada', role: 'Lead' },
        ],
        children: [{ name: { content: 'name' } }],
    });
    assert.equal(result.recordId, 42);
    assert.deepEqual(result.values, { name: 'Ada', role: 'Lead' });
});

test('parseFormRecordPrefill prefers a public-language value for translatable fields', () => {
    const result = parseFormRecordPrefill({
        section_data: [
            { record_id: 9, id_languages: 1, bio: 'seed' },
            { record_id: 9, id_languages: 2, bio: 'Hallo' },
        ],
        children: [{ name: { content: 'bio' }, translatable: { content: '1' } }],
    });
    assert.equal(result.recordId, 9);
    assert.equal(result.values.bio, 'Hallo');
});
