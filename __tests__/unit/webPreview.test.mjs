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
import {
    resolveWebPreviewSearch,
    WEB_PREVIEW_SESSION_KEY,
} from '@/config/webPreviewSession';

function createStorage() {
    const values = new Map();
    return {
        getItem: (key) => values.get(key) ?? null,
        setItem: (key, value) => values.set(key, String(value)),
        removeItem: (key) => values.delete(key),
    };
}

test('defaults when the query string is empty', () => {
    const params = parseWebPreviewParams('');
    assert.deepEqual(params, EMPTY_PREVIEW_PARAMS);
});

test('parses a full embed contract', () => {
    const params = parseWebPreviewParams(
        '?embed=1&keyword=home&device=tablet&orientation=landscape&frame=0&preview=true' +
            '&previewSession=abc123&hideDebugPanel=true&banner=0&language=de&modal=on&backendUrl=http://localhost:8000' +
            '&previewShell=1&parentOrigin=https://cms.example',
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
    assert.equal(params.modal, 'on');
    assert.equal(params.backendUrl, 'http://localhost:8000');
    assert.equal(params.previewShell, true);
    assert.equal(params.parentOrigin, 'https://cms.example');
});

test('preview-shell sync params default off and tolerate a bare parentOrigin', () => {
    const off = parseWebPreviewParams('embed=1');
    assert.equal(off.previewShell, false);
    assert.equal(off.parentOrigin, null);
    // parentOrigin without previewShell is parsed but inert (the bridge gates on previewShell).
    const bare = parseWebPreviewParams('parentOrigin=https://cms.example');
    assert.equal(bare.previewShell, false);
    assert.equal(bare.parentOrigin, 'https://cms.example');
});

test('modal mode: defaults to auto, honours on/off, tolerates unknown', () => {
    assert.equal(parseWebPreviewParams('').modal, 'auto');
    assert.equal(parseWebPreviewParams('modal=auto').modal, 'auto');
    assert.equal(parseWebPreviewParams('modal=on').modal, 'on');
    assert.equal(parseWebPreviewParams('modal=1').modal, 'on');
    assert.equal(parseWebPreviewParams('modal=true').modal, 'on');
    assert.equal(parseWebPreviewParams('modal=off').modal, 'off');
    assert.equal(parseWebPreviewParams('modal=0').modal, 'off');
    // Unknown token → safe default 'auto' (off-menu pages still open as a modal).
    assert.equal(parseWebPreviewParams('modal=banana').modal, 'auto');
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

test('embedded reload restores the initial preview query after Expo Router drops it', () => {
    const storage = createStorage();
    const initial =
        '?embed=1&keyword=home&preview=true&previewSession=code-A' +
        '&backendUrl=http://localhost:8000&previewShell=1&parentOrigin=http://localhost:3000';

    assert.equal(resolveWebPreviewSearch(initial, storage, true), initial);
    assert.equal(resolveWebPreviewSearch('', storage, true), initial);

    const stored = JSON.parse(storage.getItem(WEB_PREVIEW_SESSION_KEY));
    assert.equal(stored.version, 1);
    assert.equal(stored.search, initial);
});

test('a top-level tab never restores an embedded preview session', () => {
    const storage = createStorage();
    const initial = '?embed=1&previewSession=code-A';
    resolveWebPreviewSearch(initial, storage, true);

    assert.equal(resolveWebPreviewSearch('', storage, false), '');
});

test('a newly minted preview code replaces the prior session snapshot', () => {
    const storage = createStorage();
    resolveWebPreviewSearch('?embed=1&previewSession=code-A', storage, true);

    const next = '?embed=1&previewSession=code-B&preview=false';
    assert.equal(resolveWebPreviewSearch(next, storage, true), next);
    assert.equal(resolveWebPreviewSearch('', storage, true), next);
});

test('malformed or non-preview snapshots are discarded', () => {
    const storage = createStorage();
    storage.setItem(WEB_PREVIEW_SESSION_KEY, '{"version":1,"search":"?embed=1"}');

    assert.equal(resolveWebPreviewSearch('', storage, true), '');
    assert.equal(storage.getItem(WEB_PREVIEW_SESSION_KEY), null);
});
