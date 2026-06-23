/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Regression tests for the "anonymous page load 401-loops, cannot reach login"
 * bug introduced when the backend (core >= 0.1.18) started rejecting anonymous
 * `preview=true` and anonymous-as-admin ACL access.
 *
 * Two independent root causes, two pure contracts pinned here:
 *
 *   1. `resolvePreviewRequest` — the dev preview toggle must be IGNORED for an
 *      unauthenticated caller, so the public home/login screens fetch published
 *      content (200) instead of a draft (401). This is what stopped the
 *      `home?preview=true` / `login?preview=true` 401 storm.
 *
 *   2. `useAuthStore.clear()` — clearing the session on a mid-session 401 must
 *      PRESERVE the `bootstrapped` lifecycle flag. Resetting it re-triggered the
 *      auth bootstrap, which remounted the gated Stack and refetched the page
 *      query → 401 → clear → bootstrap → … an infinite loop that never let the
 *      screen settle into its error→login redirect.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { resolvePreviewRequest } from '../../services/previewPolicy.ts';
import { useAuthStore } from '../../stores/authStore.ts';

// ===== 1. preview is gated on authentication =====

test('resolvePreviewRequest never requests preview for an anonymous caller', () => {
    assert.equal(resolvePreviewRequest(true, false), false);
    assert.equal(resolvePreviewRequest(false, false), false);
});

test('resolvePreviewRequest follows the dev toggle once authenticated', () => {
    assert.equal(resolvePreviewRequest(true, true), true);
    assert.equal(resolvePreviewRequest(false, true), false);
});

// ===== 2. clearing the session keeps the bootstrap flag =====

test('useAuthStore.clear() drops the session but keeps bootstrapped (no re-bootstrap loop)', () => {
    useAuthStore.getState().setBootstrapped(true);
    useAuthStore.getState().setSession('access-token', { id: 1 });

    useAuthStore.getState().clear();

    const state = useAuthStore.getState();
    assert.equal(state.accessToken, null, 'access token must be cleared');
    assert.equal(state.user, null, 'user must be cleared');
    assert.equal(
        state.bootstrapped,
        true,
        'bootstrapped must survive a session clear — resetting it re-triggers the bootstrap and loops',
    );
});

test('setBootstrapped(false) is still the explicit way to force a re-bootstrap (server switch)', () => {
    useAuthStore.getState().setBootstrapped(true);
    useAuthStore.getState().setBootstrapped(false);
    assert.equal(useAuthStore.getState().bootstrapped, false);
});
