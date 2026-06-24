/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Unit coverage for the reload-resilient preview-session cache
 * (`services/mobilePreviewSession.ts`).
 *
 * The CMS Live Preview hands the mobile image a ONE-TIME code; the backend
 * deletes it on first exchange. So a live-reload / HMR refresh of the preview
 * iframe must REUSE the scoped token cached under that code instead of
 * re-exchanging the consumed code (which 401s to a blank pane). These tests pin
 * that contract: a same-code read hits, a different-code read misses, an expired
 * token is ignored, and a missing `window` (native app / SSR) is safe.
 *
 * The SUT reads `window.sessionStorage` lazily inside each call, so installing a
 * mock on `globalThis.window` before invoking the functions is sufficient.
 */

import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
    readCachedPreviewSession,
    writeCachedPreviewSession,
} from '@/services/mobilePreviewSession';

/** Minimal in-memory `Storage` good enough for the cache read/write paths. */
function installStorage() {
    const map = new Map();
    globalThis.window = {
        sessionStorage: {
            getItem: (k) => (map.has(k) ? map.get(k) : null),
            setItem: (k, v) => {
                map.set(k, String(v));
            },
            removeItem: (k) => {
                map.delete(k);
            },
            clear: () => map.clear(),
            key: (i) => [...map.keys()][i] ?? null,
            get length() {
                return map.size;
            },
        },
    };
}

const user = { id: 7, name: 'QA Preview' };

beforeEach(() => {
    installStorage();
});

test('a reload reuses the token cached under the SAME one-time code', () => {
    writeCachedPreviewSession('code-A', { accessToken: 'jwt-A', expiresIn: 300, user });

    const hit = readCachedPreviewSession('code-A');
    assert.ok(hit, 'expected a cache hit for the same code');
    assert.equal(hit.accessToken, 'jwt-A');
    assert.equal(hit.expiresIn, 300);
    assert.equal(hit.user.id, 7);
});

test('a different code misses (a consumed code is never reused for another page session)', () => {
    writeCachedPreviewSession('code-A', { accessToken: 'jwt-A', expiresIn: 300, user });

    assert.equal(readCachedPreviewSession('code-B'), null);
});

test('an expired token is ignored so the next load exchanges afresh', () => {
    const realNow = Date.now;
    try {
        Date.now = () => 0;
        writeCachedPreviewSession('code-A', { accessToken: 'jwt-A', expiresIn: 300, user });
        // Jump well past the 300_000 ms absolute expiry.
        Date.now = () => 400_000;
        assert.equal(readCachedPreviewSession('code-A'), null);
    } finally {
        Date.now = realNow;
    }
});

test('a blank code never reads or writes the cache', () => {
    writeCachedPreviewSession('', { accessToken: 'jwt-A', expiresIn: 300, user });
    assert.equal(readCachedPreviewSession(''), null);
    // A real code is still unaffected by the blank-code no-ops.
    assert.equal(readCachedPreviewSession('code-A'), null);
});

test('no storage available (native app / SSR) is a safe null, never a throw', () => {
    const realWindow = globalThis.window;
    try {
        delete globalThis.window;
        assert.equal(readCachedPreviewSession('code-A'), null);
        // Best-effort write must not throw when there is no storage.
        assert.doesNotThrow(() =>
            writeCachedPreviewSession('code-A', { accessToken: 'x', expiresIn: 1, user }),
        );
    } finally {
        globalThis.window = realWindow;
    }
});
