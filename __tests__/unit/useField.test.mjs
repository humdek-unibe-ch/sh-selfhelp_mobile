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
