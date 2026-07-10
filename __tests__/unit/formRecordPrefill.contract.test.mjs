/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Mobile FormUserInput must consume shared form-record prefill (same fixture
 * shape as frontend FormStyle / shared unit tests).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
    flattenFormRecordPrefillValues,
    parseFormRecordPrefill,
} from '@selfhelp/shared';

const here = dirname(fileURLToPath(import.meta.url));
const formSource = readFileSync(
    join(here, '../../components/styles/forms/FormUserInput/FormUserInput.tsx'),
    'utf8',
);

const FIXTURE = {
    section_data: [
        {
            record_id: 42,
            id_users: 3,
            user_name: 'qa.user',
            id_languages: 1,
            title: 'Hello',
            notes: 'plain',
            nested: { ignored: true },
        },
    ],
    children: [
        { name: { content: 'title' }, translatable: { content: '0' } },
        { name: { content: 'notes' }, translatable: { content: '0' } },
    ],
};

test('shared parseFormRecordPrefill returns the canonical fixture result', () => {
    const prefill = parseFormRecordPrefill(FIXTURE);
    assert.deepEqual(prefill, {
        recordId: 42,
        values: { title: 'Hello', notes: 'plain' },
    });
    assert.deepEqual(flattenFormRecordPrefillValues(prefill.values), {
        title: 'Hello',
        notes: 'plain',
    });
});

test('FormUserInput imports parseFormRecordPrefill from @selfhelp/shared', () => {
    assert.match(formSource, /parseFormRecordPrefill/);
    assert.match(formSource, /@selfhelp\/shared/);
    assert.doesNotMatch(formSource, /sectionDataArray\s*=\s*style\.section_data/);
});
