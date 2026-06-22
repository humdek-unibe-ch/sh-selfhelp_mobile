/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Unit tests for the mobile RichTextEditor toolbar markup helper. Guards that
 * tapping Bold / Italic / Underline / Link wraps the current selection in the
 * exact safe inline subset the renderers (`parseInlineRich` + `InlineText`)
 * understand, and restores a selection over the wrapped inner text.
 *
 * Run via the repo's `node --test` wiring; TypeScript is stripped natively.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { applyInlineFormat } from '../../components/styles/forms/richTextMarkup.ts';

test('bold wraps the selection in <strong> and reselects the inner text', () => {
    const edit = applyInlineFormat('hello world', 0, 5, 'bold');
    assert.equal(edit.text, '<strong>hello</strong> world');
    assert.equal(edit.text.slice(edit.selectionStart, edit.selectionEnd), 'hello');
    assert.equal(edit.selectionStart, '<strong>'.length);
});

test('italic and underline wrap with their inline tags', () => {
    assert.equal(applyInlineFormat('a', 0, 1, 'italic').text, '<em>a</em>');
    assert.equal(applyInlineFormat('a', 0, 1, 'underline').text, '<u>a</u>');
});

test('link wraps the selection with an editable https placeholder href', () => {
    const edit = applyInlineFormat('docs', 0, 4, 'link');
    assert.equal(edit.text, '<a href="https://">docs</a>');
    assert.equal(edit.text.slice(edit.selectionStart, edit.selectionEnd), 'docs');
});

test('an empty selection inserts an empty tag pair at the caret', () => {
    const edit = applyInlineFormat('ab', 1, 1, 'bold');
    assert.equal(edit.text, 'a<strong></strong>b');
    assert.equal(edit.selectionStart, edit.selectionEnd);
    assert.equal(edit.selectionStart, 1 + '<strong>'.length);
});

test('out-of-range / reversed selections are clamped, never throwing', () => {
    assert.equal(applyInlineFormat('hi', -5, 99, 'bold').text, '<strong>hi</strong>');
    assert.equal(applyInlineFormat(undefined, 0, 0, 'bold').text, '<strong></strong>');
});

test('emitted markup round-trips: only the safe inline subset is produced', () => {
    const edit = applyInlineFormat('x', 0, 1, 'bold');
    // No block tags, no attributes beyond href — exactly what InlineText renders.
    assert.match(edit.text, /^<strong>x<\/strong>$/);
});
