/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Regression coverage for the boot-time `previewSession` URL strip
 * (`config/webPreviewSession.ts`).
 *
 * The CMS Live Preview embeds the mobile web image with a one-time
 * `previewSession` code in the iframe URL. Left there, it destabilises
 * expo-router's web state<->URL round-trip, which re-pushes the root route on
 * every commit until Chromium throttles the `history.pushState` flood and the
 * pane hangs on "Starting up…". The fix strips `previewSession` from the address
 * bar before expo-router boots while preserving the full embed query in
 * `sessionStorage` so the token exchange can still recover the code.
 *
 * These tests pin that contract: the pure planner removes the preview-only embed
 * query from the visible URL and persists only a valid embed contract, and the
 * window wiring writes the snapshot + `replaceState`s the cleaned URL, while
 * staying a safe no-op when there is no code, no `window`, or no history.
 */

import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
    WEB_PREVIEW_SESSION_KEY,
    capturePreviewSessionFromUrl,
    planPreviewSessionCleanup,
} from '@/config/webPreviewSession';

const FULL =
    '?embed=1&preview=true&device=phone&keyword=test&language=de-CH&modal=off&previewSession=code123&previewShell=1&parentOrigin=http%3A%2F%2F127.0.0.1%3A9234';

/** Install a mutable `window` with location, history, and sessionStorage mocks. */
function installWindow(search) {
    const store = new Map();
    const replaceCalls = [];
    globalThis.window = {
        location: { pathname: '/mobile-preview/', search, hash: '' },
        history: {
            state: { id: 'seed' },
            replaceState(state, _title, url) {
                replaceCalls.push({ state, url });
                // Mirror a real browser: applying the URL updates location.
                const qIndex = url.indexOf('?');
                this._lastUrl = url;
                globalThis.window.location.search = qIndex >= 0 ? url.slice(qIndex) : '';
            },
        },
        sessionStorage: {
            getItem: (k) => (store.has(k) ? store.get(k) : null),
            setItem: (k, v) => store.set(k, String(v)),
            removeItem: (k) => store.delete(k),
        },
    };
    return { store, replaceCalls };
}

beforeEach(() => {
    delete globalThis.window;
});

test('planner returns null when there is no previewSession (nothing to strip)', () => {
    assert.equal(planPreviewSessionCleanup(''), null);
    assert.equal(planPreviewSessionCleanup('?embed=1&keyword=test&modal=off'), null);
});

test('planner strips the visible embed query and persists a valid embed contract', () => {
    const plan = planPreviewSessionCleanup(FULL);
    assert.ok(plan);
    // The full query (with the one-time code) is preserved for recovery.
    assert.equal(plan.persistSearch, FULL);
    // The address bar loses every preview-only param; Expo Router reads the bare
    // preview path, while getWebPreviewRuntime recovers the full contract from
    // sessionStorage.
    assert.equal(plan.cleanedSearch, '');
});

test('planner strips previewSession even without embed, but does not persist a non-contract query', () => {
    const bare = planPreviewSessionCleanup('?previewSession=code123');
    assert.ok(bare);
    assert.equal(bare.persistSearch, null);
    assert.equal(bare.cleanedSearch, '');

    const partial = planPreviewSessionCleanup('?previewSession=code123&foo=bar');
    assert.ok(partial);
    assert.equal(partial.persistSearch, null);
    assert.equal(partial.cleanedSearch, '?foo=bar');
});

test('capture persists the full embed query and removes preview params from the URL', () => {
    const { store, replaceCalls } = installWindow(FULL);

    capturePreviewSessionFromUrl();

    const snapshot = JSON.parse(store.get(WEB_PREVIEW_SESSION_KEY));
    assert.equal(snapshot.version, 1);
    assert.equal(snapshot.search, FULL);

    assert.equal(replaceCalls.length, 1);
    assert.equal(replaceCalls[0].state.id, 'seed', 'preserves the existing history state');
    assert.equal(replaceCalls[0].url, '/mobile-preview/');
});

test('capture is a no-op when the URL has no previewSession', () => {
    const { store, replaceCalls } = installWindow('?embed=1&keyword=test');

    capturePreviewSessionFromUrl();

    assert.equal(store.has(WEB_PREVIEW_SESSION_KEY), false);
    assert.equal(replaceCalls.length, 0);
});

test('capture never throws when there is no window (native app / SSR)', () => {
    delete globalThis.window;
    assert.doesNotThrow(() => capturePreviewSessionFromUrl());
});
