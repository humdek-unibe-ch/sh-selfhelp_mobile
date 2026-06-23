/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Unit tests for the global content sanitiser applied at the mobile
 * display-text chokepoint (`useInterpolatedField`). Regression guard for the
 * reported bug where a badge label authored as markdown leaked the processed
 * `<p class="single-line-paragraph">…</p>` markup as literal tag text on
 * mobile (and web). JSON-awareness is asserted so structured payloads survive.
 *
 * Run via the repo's `node --test` wiring; TypeScript is stripped natively.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { stripHtmlToText, parseInlineRich, hasInlineFormatting } from '../../components/renderer/sanitizeContent.ts';

test('strips the reported markdown-processed paragraph wrapper to plain text', () => {
    assert.equal(
        stripHtmlToText('<p class="single-line-paragraph">9 STEF</p>'),
        '9 STEF',
    );
});

test('leaves tag-free plain text untouched', () => {
    assert.equal(stripHtmlToText('FILLED · BLUE · LG'), 'FILLED · BLUE · LG');
    assert.equal(stripHtmlToText('Welcome back'), 'Welcome back');
});

test('drops arbitrary inline + block tags but keeps the words', () => {
    assert.equal(stripHtmlToText('<strong>Hi</strong> <em>there</em>'), 'Hi there');
    assert.equal(stripHtmlToText('<div><p>one</p><p>two</p></div>'), 'one two');
});

test('turns <br> into a space rather than gluing words', () => {
    assert.equal(stripHtmlToText('line one<br/>line two'), 'line one line two');
});

test('decodes the common HTML entities', () => {
    assert.equal(stripHtmlToText('Tom &amp; Jerry'), 'Tom & Jerry');
    assert.equal(stripHtmlToText('a &lt;b&gt; c &nbsp;d'), 'a <b> c d');
});

test('leaves JSON payloads untouched (JSON-aware)', () => {
    const obj = '{"label":"<b>x</b>","n":1}';
    const arr = '[{"v":"a"},{"v":"b"}]';
    assert.equal(stripHtmlToText(obj), obj);
    assert.equal(stripHtmlToText(arr), arr);
});

test('handles empty / nullish input safely', () => {
    assert.equal(stripHtmlToText(''), '');
    assert.equal(stripHtmlToText(undefined), '');
    assert.equal(stripHtmlToText(null), '');
});

// --- parseInlineRich: carries inline formatting (bold/italic/underline/link) to mobile ---

test('parseInlineRich returns one plain run for tag-free text', () => {
    assert.deepEqual(parseInlineRich('hello world'), [{ text: 'hello world' }]);
});

test('parseInlineRich marks <strong>/<b> bold and <em>/<i> italic and <u> underline', () => {
    assert.deepEqual(parseInlineRich('a <strong>bold</strong> c'), [
        { text: 'a ' },
        { text: 'bold', bold: true },
        { text: ' c' },
    ]);
    assert.deepEqual(parseInlineRich('<em>e</em><i>i</i><u>u</u>'), [
        { text: 'ei', italic: true },
        { text: 'u', underline: true },
    ]);
});

test('parseInlineRich combines nested formatting into one run', () => {
    assert.deepEqual(parseInlineRich('<strong>bold <em>both</em></strong>'), [
        { text: 'bold ', bold: true },
        { text: 'both', bold: true, italic: true },
    ]);
});

test('parseInlineRich captures the href on anchor runs', () => {
    assert.deepEqual(parseInlineRich('see <a href="https://x.test">here</a>'), [
        { text: 'see ' },
        { text: 'here', href: 'https://x.test' },
    ]);
});

test('parseInlineRich flattens the leading <p> wrapper the editor leaves behind', () => {
    assert.deepEqual(parseInlineRich('<p class="single-line-paragraph">9 STEF</p>'), [
        { text: '9 STEF' },
    ]);
});

test('parseInlineRich collapses block tags + <br> to single spaces', () => {
    assert.deepEqual(parseInlineRich('<p>a</p><p>b</p>'), [{ text: 'a b' }]);
    assert.deepEqual(parseInlineRich('line<br/>break'), [{ text: 'line break' }]);
});

test('parseInlineRich never touches structured JSON payloads', () => {
    const json = '{"type":"array","items":["a","b"]}';
    assert.deepEqual(parseInlineRich(json), [{ text: json }]);
});

test('hasInlineFormatting is true only for the supported inline subset', () => {
    assert.equal(hasInlineFormatting('<strong>x</strong>'), true);
    assert.equal(hasInlineFormatting('<a href="#">x</a>'), true);
    assert.equal(hasInlineFormatting('plain'), false);
    assert.equal(hasInlineFormatting('<p>plain</p>'), false);
    assert.equal(hasInlineFormatting('{"a":1}'), false);
    assert.equal(hasInlineFormatting(null), false);
});
