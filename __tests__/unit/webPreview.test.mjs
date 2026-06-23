/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Unit coverage for the pure web-preview embed-contract parser
 * (`config/webPreviewContract.ts`). The parser is the security-relevant surface
 * (it decodes the iframe query string into session-only flags), so it is tested
 * in isolation from the expo runtime accessor.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
    EMPTY_PREVIEW_PARAMS,
    parseWebPreviewParams,
} from '@/config/webPreviewContract';

test('defaults when the query string is empty', () => {
    const params = parseWebPreviewParams('');
    assert.deepEqual(params, EMPTY_PREVIEW_PARAMS);
});

test('parses a full embed contract', () => {
    const params = parseWebPreviewParams(
        '?embed=1&keyword=home&device=tablet&orientation=landscape&frame=0&preview=true' +
            '&previewSession=abc123&hideDebugPanel=true&banner=0&language=de&backendUrl=http://localhost:8000',
    );
    assert.equal(params.embed, true);
    assert.equal(params.keyword, 'home');
    assert.equal(params.device, 'tablet');
    assert.equal(params.orientation, 'landscape');
    assert.equal(params.frame, false);
    assert.equal(params.preview, true);
    assert.equal(params.previewSession, 'abc123');
    assert.equal(params.hideDebugPanel, true);
    assert.equal(params.banner, false);
    assert.equal(params.language, 'de');
    assert.equal(params.backendUrl, 'http://localhost:8000');
});

test('accepts a query string without the leading ?', () => {
    const params = parseWebPreviewParams('embed=yes&device=phone');
    assert.equal(params.embed, true);
    assert.equal(params.device, 'phone');
});

test('accepts a URLSearchParams instance', () => {
    const params = parseWebPreviewParams(new URLSearchParams({ embed: 'on', frame: 'off' }));
    assert.equal(params.embed, true);
    assert.equal(params.frame, false);
});

test('boolean tokens are case/format tolerant with safe fallbacks', () => {
    assert.equal(parseWebPreviewParams('embed=TRUE').embed, true);
    assert.equal(parseWebPreviewParams('embed=No').embed, false);
    // Unknown token → fall back to the contract default (embed default false).
    assert.equal(parseWebPreviewParams('embed=maybe').embed, false);
    // frame default is true; an unknown token keeps it true.
    assert.equal(parseWebPreviewParams('frame=banana').frame, true);
});

test('unknown enum values fall back to phone / portrait', () => {
    const params = parseWebPreviewParams('device=watch&orientation=diagonal');
    assert.equal(params.device, 'phone');
    assert.equal(params.orientation, 'portrait');
});

test('blank string params normalise to null', () => {
    const params = parseWebPreviewParams('keyword=&previewSession=%20%20&language=');
    assert.equal(params.keyword, null);
    assert.equal(params.previewSession, null);
    assert.equal(params.language, null);
});
