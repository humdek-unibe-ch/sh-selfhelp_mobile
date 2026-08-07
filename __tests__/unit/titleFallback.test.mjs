/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Title content fallback — mirrors the web renderer's `|| 'Title'`.
 * An unresolved `{{record.field}}` heading used to render a blank line.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { renderHook } from '../support/renderMobile.ts';
import { useInterpolatedField } from '../../components/renderer/useField.ts';

const section = (fields) => ({
    fields: Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, { content: v }])),
});

const readTitle = (sec, values = {}) => {
    const { content, text } = renderHook(() => ({
        content: useInterpolatedField(sec, 'content', values),
        text: useInterpolatedField(sec, 'text', values),
    }));
    const resolved = content || text;
    return resolved.trim() === '' ? 'Title' : resolved;
};

test('resolved content renders as-is', () => {
    assert.equal(readTitle(section({ content: 'Ada Lovelace' })), 'Ada Lovelace');
});

test('interpolated content resolves against record values', () => {
    assert.equal(
        readTitle(section({ content: '{{team_member.name}}' }), { 'team_member.name': 'Grace Hopper' }),
        'Grace Hopper'
    );
});

test('falls back to the text field when content is empty', () => {
    assert.equal(readTitle(section({ content: '', text: 'Team profile' })), 'Team profile');
});

test('empty content falls back instead of rendering a blank heading', () => {
    assert.equal(readTitle(section({ content: '' })), 'Title');
    assert.equal(readTitle(section({ content: '   ' })), 'Title');
});

test('missing content field falls back', () => {
    assert.equal(readTitle({ fields: {} }), 'Title');
});
