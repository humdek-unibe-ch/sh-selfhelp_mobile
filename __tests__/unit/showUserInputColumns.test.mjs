/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Unit tests for the mobile `show-user-input` column selector. The author picks
 * which submitted fields render (and their labels) through the `fields_map` JSON
 * — the same contract the web table honours — so this pure resolver must:
 *   - select + relabel exactly the mapped columns when a map is set,
 *   - fall back to every non-bookkeeping key when no map is set,
 *   - prepend the leading "Date" column when show_timestamp is on,
 *   - tolerate empty / malformed `fields_map` JSON without throwing,
 *   - (issue #56 v2) default headers to the `field_labels` display name and
 *     resolve a `fields_map` authored against either the immutable field_key or
 *     the current display_name.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
    buildShowUserInputColumns,
    parseFieldMappings,
} from '../../components/styles/forms/showUserInputColumns.ts';

const SAMPLE = { record_id: 7, id_users: 3, _can_delete: true, entry_date: '2026-06-22', name: 'Ann', mood: 'ok' };

test('uses fields_map to select and relabel only the chosen columns', () => {
    const map = JSON.stringify([{ field_name: 'mood', field_new_name: 'How are you?' }]);
    assert.deepEqual(buildShowUserInputColumns(map, SAMPLE, false), [
        { key: 'mood', label: 'How are you?' },
    ]);
});

test('falls back to every non-bookkeeping key when no fields_map is set', () => {
    assert.deepEqual(buildShowUserInputColumns(undefined, SAMPLE, false), [
        { key: 'name', label: 'name' },
        { key: 'mood', label: 'mood' },
    ]);
});

test('prepends the leading Date column when show_timestamp is enabled', () => {
    const cols = buildShowUserInputColumns(undefined, SAMPLE, true);
    assert.deepEqual(cols[0], { key: 'entry_date', label: 'Date' });
    assert.deepEqual(cols.slice(1), [
        { key: 'name', label: 'name' },
        { key: 'mood', label: 'mood' },
    ]);
});

test('label falls back to the field name when field_new_name is blank', () => {
    const map = JSON.stringify([{ field_name: 'name', field_new_name: '' }]);
    assert.deepEqual(buildShowUserInputColumns(map, SAMPLE, false), [{ key: 'name', label: 'name' }]);
});

test('tolerates malformed / non-array fields_map JSON', () => {
    assert.deepEqual(parseFieldMappings('not json'), []);
    assert.deepEqual(parseFieldMappings('{"a":1}'), []);
    // malformed map → fall back to data keys, not a crash.
    assert.deepEqual(buildShowUserInputColumns('not json', { name: 'x' }, false), [{ key: 'name', label: 'name' }]);
});

test('empty entry list yields no columns (no crash on undefined sample)', () => {
    assert.deepEqual(buildShowUserInputColumns(undefined, undefined, false), []);
    assert.deepEqual(buildShowUserInputColumns(undefined, undefined, true), [{ key: 'entry_date', label: 'Date' }]);
});

// Issue #56 v2: entries are keyed by the immutable field_key; the human label
// lives in field_labels (field_key => display_name).
const FIELD_KEY_SAMPLE = { record_id: 7, id_users: 3, _can_delete: true, entry_date: '2026-06-22', section_230: 'Ann', section_231: 'ok' };
const FIELD_LABELS = { section_230: 'Name', section_231: 'How are you?' };

test('default headers use the field_labels display name, not the raw field_key', () => {
    assert.deepEqual(buildShowUserInputColumns(undefined, FIELD_KEY_SAMPLE, false, FIELD_LABELS), [
        { key: 'section_230', label: 'Name' },
        { key: 'section_231', label: 'How are you?' },
    ]);
});

test('default headers fall back to the field_key when no label is mapped', () => {
    assert.deepEqual(buildShowUserInputColumns(undefined, FIELD_KEY_SAMPLE, false, { section_230: 'Name' }), [
        { key: 'section_230', label: 'Name' },
        { key: 'section_231', label: 'section_231' },
    ]);
});

test('fields_map resolves a mapping authored against the immutable field_key', () => {
    const map = JSON.stringify([{ field_name: 'section_231', field_new_name: '' }]);
    assert.deepEqual(buildShowUserInputColumns(map, FIELD_KEY_SAMPLE, false, FIELD_LABELS), [
        { key: 'section_231', label: 'How are you?' },
    ]);
});

test('fields_map resolves a mapping authored against the current display_name (rename-safe)', () => {
    const map = JSON.stringify([{ field_name: 'How are you?', field_new_name: 'Mood' }]);
    assert.deepEqual(buildShowUserInputColumns(map, FIELD_KEY_SAMPLE, false, FIELD_LABELS), [
        { key: 'section_231', label: 'Mood' },
    ]);
});

test('fields_map drops a mapping that matches no field_key or display_name', () => {
    const map = JSON.stringify([
        { field_name: 'section_230', field_new_name: 'Name' },
        { field_name: 'nonexistent', field_new_name: 'Ghost' },
    ]);
    assert.deepEqual(buildShowUserInputColumns(map, FIELD_KEY_SAMPLE, false, FIELD_LABELS), [
        { key: 'section_230', label: 'Name' },
    ]);
});
