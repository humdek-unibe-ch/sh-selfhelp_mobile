/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Unit tests for the CMS field readers (plan Slice 9; canonical Testing
 * Rule: every renderer helper ships a `node --test`). These helpers turn
 * the CMS section payload (`{ fields: { name: { content } } }` or a
 * top-level field-shaped prop) into typed values with safe fallbacks —
 * the foundation every mobile style impl builds on, so their edge cases
 * (missing field, null content, type coercion) are worth pinning.
 *
 * Run via the repo's `node --test` wiring (alias/`__DEV__` preload in
 * __tests__/support/register.mjs); TypeScript is stripped natively.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
    readField,
    readStringField,
    readBooleanField,
    readNumberField,
    useInterpolatedField,
} from '../../components/renderer/useField.ts';
import { renderHook } from '../support/renderMobile.ts';

const sectionWithBag = (name, content) => ({ fields: { [name]: { content } } });

test('readField unwraps content from the fields bag', () => {
    assert.equal(readField(sectionWithBag('title', 'Hello'), 'title'), 'Hello');
});

test('readField unwraps content from a top-level field-shaped prop', () => {
    assert.equal(readField({ label: { content: 'Top' } }, 'label'), 'Top');
});

test('readField prefers a top-level field over the bag', () => {
    const section = { name: { content: 'top' }, fields: { name: { content: 'bag' } } };
    assert.equal(readField(section, 'name'), 'top');
});

test('readField returns undefined when the field is absent', () => {
    assert.equal(readField({ fields: {} }, 'missing'), undefined);
    assert.equal(readField({}, 'missing'), undefined);
});

test('readStringField returns the content as a string', () => {
    assert.equal(readStringField(sectionWithBag('t', 'abc'), 't'), 'abc');
    assert.equal(readStringField(sectionWithBag('t', 42), 't'), '42');
});

test('readStringField returns the fallback for missing / null content', () => {
    assert.equal(readStringField({ fields: {} }, 't'), '');
    assert.equal(readStringField({ fields: {} }, 't', 'fallback'), 'fallback');
    assert.equal(readStringField(sectionWithBag('t', null), 't', 'fb'), 'fb');
});

test('readBooleanField coerces CMS truthy/falsy encodings', () => {
    assert.equal(readBooleanField(sectionWithBag('b', true), 'b'), true);
    assert.equal(readBooleanField(sectionWithBag('b', '1'), 'b'), true);
    assert.equal(readBooleanField(sectionWithBag('b', 'true'), 'b'), true);
    assert.equal(readBooleanField(sectionWithBag('b', 'TRUE'), 'b'), true);
    assert.equal(readBooleanField(sectionWithBag('b', 2), 'b'), true);
    assert.equal(readBooleanField(sectionWithBag('b', '0'), 'b'), false);
    assert.equal(readBooleanField(sectionWithBag('b', 'no'), 'b'), false);
    assert.equal(readBooleanField(sectionWithBag('b', 0), 'b'), false);
});

test('readBooleanField returns the fallback for missing / empty content', () => {
    assert.equal(readBooleanField({ fields: {} }, 'b'), false);
    assert.equal(readBooleanField({ fields: {} }, 'b', true), true);
    assert.equal(readBooleanField(sectionWithBag('b', ''), 'b', true), true);
});

test('readNumberField parses numeric content', () => {
    assert.equal(readNumberField(sectionWithBag('n', 5), 'n'), 5);
    assert.equal(readNumberField(sectionWithBag('n', '7'), 'n'), 7);
    assert.equal(readNumberField(sectionWithBag('n', '3.5'), 'n'), 3.5);
});

test('readNumberField returns the fallback for missing / non-numeric content', () => {
    assert.equal(readNumberField({ fields: {} }, 'n'), undefined);
    assert.equal(readNumberField({ fields: {} }, 'n', 9), 9);
    assert.equal(readNumberField(sectionWithBag('n', 'abc'), 'n', 0), 0);
    assert.equal(readNumberField(sectionWithBag('n', ''), 'n', 1), 1);
});

test('useInterpolatedField interpolates {{placeholders}} against values', () => {
    const out = renderHook(() =>
        useInterpolatedField(sectionWithBag('greeting', 'Hi {{name}}!'), 'greeting', { name: 'Sam' }),
    );
    assert.equal(out, 'Hi Sam!');
});

test('useInterpolatedField returns the fallback when the field is missing', () => {
    const out = renderHook(() =>
        useInterpolatedField({ fields: {} }, 'greeting', { name: 'Sam' }, 'default'),
    );
    assert.equal(out, 'default');
});

test('useInterpolatedField returns the raw string when there is nothing to interpolate', () => {
    const out = renderHook(() =>
        useInterpolatedField(sectionWithBag('greeting', 'Plain text'), 'greeting', {}),
    );
    assert.equal(out, 'Plain text');
});

// ===== edge cases: fall-through, wrong types, richer interpolation =====

test('readField falls through to the bag when the top-level prop is not field-shaped', () => {
    // A top-level prop that is an object WITHOUT `content` must not shadow the bag.
    const section = { name: { notContent: 1 }, fields: { name: { content: 'bag' } } };
    assert.equal(readField(section, 'name'), 'bag');
});

test('readField returns non-string content unchanged (object / array / boolean)', () => {
    assert.deepEqual(readField(sectionWithBag('o', { a: 1 }), 'o'), { a: 1 });
    assert.deepEqual(readField(sectionWithBag('arr', [1, 2]), 'arr'), [1, 2]);
    assert.equal(readField(sectionWithBag('flag', false), 'flag'), false);
});

test('readStringField stringifies non-string content', () => {
    assert.equal(readStringField(sectionWithBag('b', true), 'b'), 'true');
    assert.equal(readStringField(sectionWithBag('o', { a: 1 }), 'o'), '[object Object]');
});

test('readBooleanField treats non-empty objects as truthy and "false" as falsy', () => {
    assert.equal(readBooleanField(sectionWithBag('o', {}), 'o'), true);
    assert.equal(readBooleanField(sectionWithBag('arr', []), 'arr'), true);
    assert.equal(readBooleanField(sectionWithBag('s', 'false'), 's'), false);
});

test('readNumberField coerces booleans and rejects non-numeric objects', () => {
    assert.equal(readNumberField(sectionWithBag('n', true), 'n'), 1);
    assert.equal(readNumberField(sectionWithBag('n', '  5 '), 'n'), 5);
    assert.equal(readNumberField(sectionWithBag('n', {}), 'n', 0), 0);
});

test('useInterpolatedField fills multiple placeholders with realistic CMS values', () => {
    const out = renderHook(() =>
        useInterpolatedField(
            sectionWithBag('msg', 'Order {{id}} total {{amount}} ({{active}})'),
            'msg',
            { id: 42, amount: 9.5, active: true },
        ),
    );
    assert.equal(out, 'Order 42 total 9.5 (true)');
});

test('useInterpolatedField leaves unknown placeholders intact', () => {
    const out = renderHook(() =>
        useInterpolatedField(sectionWithBag('msg', 'Hi {{missing}}'), 'msg', { name: 'Sam' }),
    );
    assert.equal(out, 'Hi {{missing}}');
});
