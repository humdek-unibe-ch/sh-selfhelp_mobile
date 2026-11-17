/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * F178: recognising a server-built `/lists/…/files/…` href and the authenticated
 * current-file request it maps to. InlineText uses this before Linking.openURL.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { ENDPOINTS } from '@selfhelp/shared';

import {
    currentFileRequest,
    isListFileHref,
    parseListFileHref,
} from '../../services/listFileLink.ts';

const here = dirname(fileURLToPath(import.meta.url));

test('parseListFileHref reads section, record, field, page_id and index', () => {
    const href = '/lists/12/records/34/files/doc?page_id=5&index=1';
    assert.deepEqual(parseListFileHref(href), {
        sectionId: 12,
        recordId: 34,
        fieldKey: 'doc',
        pageId: 5,
        index: 1,
    });
    assert.equal(isListFileHref(href), true);
});

test('parseListFileHref accepts encoded field keys and cms-api prefix', () => {
    const href = '/cms-api/v1/lists/9/records/8/files/section_12%2F..?page_id=3&index=0';
    const parsed = parseListFileHref(href);
    assert.ok(parsed);
    assert.equal(parsed.sectionId, 9);
    assert.equal(parsed.fieldKey, 'section_12/..');
    assert.equal(parsed.pageId, 3);
});

test('parseListFileHref rejects ordinary http links', () => {
    assert.equal(parseListFileHref('https://example.com/doc.pdf'), null);
    assert.equal(parseListFileHref('/pages/home'), null);
    assert.equal(isListFileHref('https://example.com'), false);
});

test('currentFileRequest uses the shared CURRENT_FILE route', () => {
    const { url, params } = currentFileRequest({
        sectionId: 311,
        recordId: 41,
        fieldKey: 'portrait',
        pageId: 7,
        index: 0,
    });
    assert.equal(url, ENDPOINTS.LISTS.CURRENT_FILE(311, 41, 'portrait'));
    assert.deepEqual(params, { page_id: '7', index: '0' });
});

test('InlineText routes list-file presses through downloadCurrentFile', () => {
    const source = readFileSync(join(here, '../../components/renderer/InlineText.tsx'), 'utf8');
    assert.match(source, /parseListFileHref/);
    assert.match(source, /downloadCurrentFile/);
    assert.match(source, /openInlineHref/);
    assert.match(source, /Linking\.openURL/);
});

test('InlineText catches a failed list-file download and shows the history failure message', () => {
    const source = readFileSync(join(here, '../../components/renderer/InlineText.tsx'), 'utf8');
    assert.match(source, /messageForFileDownloadFailure/);
    assert.match(source, /Alert\.alert/);
    assert.match(source, /try\s*\{/);
    assert.match(source, /catch\s*\(/);
});

test('messageForFileDownloadFailure matches FormList history wording', async () => {
    const { messageForFileDownloadFailure, historicalFileFailure } = await import(
        '../../services/formListFiles.ts'
    );
    assert.equal(historicalFileFailure({ response: { status: 403 } }), 'denied');
    assert.equal(historicalFileFailure({ response: { status: 404 } }), 'gone');
    assert.equal(historicalFileFailure({ response: { status: 500 } }), 'failed');
    assert.equal(messageForFileDownloadFailure({ response: { status: 403 } }), 'You may not download this file.');
    assert.equal(messageForFileDownloadFailure({ response: { status: 404 } }), 'This file is no longer available.');
    assert.equal(
        messageForFileDownloadFailure({ response: { status: 500 } }),
        'This file could not be downloaded. Try again.',
    );
});

test('formListFileDownload exports downloadCurrentFile into the shared cache folder', () => {
    const source = readFileSync(join(here, '../../services/formListFileDownload.ts'), 'utf8');
    assert.match(source, /export async function downloadCurrentFile/);
    assert.match(source, /selfhelp-history-files/);
});
