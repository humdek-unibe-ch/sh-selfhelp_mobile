/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Regression coverage for the server-hydration failsafe
 * (`services/serverHydrationFailsafe.ts`).
 *
 * The root splash gate is `ready = serverHydrated && (!serverUrl || bootstrapped)`.
 * `AuthProvider` guarantees `bootstrapped` flips within a hard ceiling, but before
 * this failsafe NOTHING guaranteed `serverHydrated`: a rejected or silently-hung
 * `hydrateServerStore()` (a wedged dev preview-session exchange, or an HMR / Metro
 * hiccup on a rapid in-iframe reload) left `serverHydrated` false forever and the
 * CMS Live Preview stranded on the "Starting up…" splash. These tests pin the
 * contract: the ceiling always releases the splash, it fires once, and the
 * mark-helper is a no-op once hydration completed normally.
 */

import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import {
    HYDRATION_CEILING_MS,
    ensureServerHydrationCeiling,
    markServerHydratedFailsafe,
    _resetServerHydrationCeiling,
} from '@/services/serverHydrationFailsafe';
import { useServerStore } from '@/stores/serverStore';

const realSetTimeout = globalThis.setTimeout;
/** @type {{ cb: () => void, ms: number }[]} */
let scheduled = [];

beforeEach(() => {
    scheduled = [];
    // Capture timers synchronously instead of letting them actually run.
    globalThis.setTimeout = (cb, ms) => {
        scheduled.push({ cb, ms });
        return scheduled.length;
    };
    useServerStore.setState({ hydrated: false });
    _resetServerHydrationCeiling();
});

afterEach(() => {
    globalThis.setTimeout = realSetTimeout;
});

test('the ceiling releases the splash when hydration never completes', () => {
    assert.equal(useServerStore.getState().hydrated, false);

    ensureServerHydrationCeiling();

    // One timer armed at the documented ceiling; splash still gated until it fires.
    assert.equal(scheduled.length, 1);
    assert.equal(scheduled[0].ms, HYDRATION_CEILING_MS);
    assert.equal(useServerStore.getState().hydrated, false);

    scheduled[0].cb();

    assert.equal(
        useServerStore.getState().hydrated,
        true,
        'ceiling must flip serverHydrated so `ready` can resolve',
    );
});

test('the ceiling is armed only once across repeated provider mounts', () => {
    ensureServerHydrationCeiling();
    ensureServerHydrationCeiling();
    ensureServerHydrationCeiling();

    assert.equal(scheduled.length, 1, 'a single ceiling timer for the app lifetime');
});

test('a normally-completed hydration is left untouched by the ceiling', () => {
    // Hydration finished first (preview/dev path already called setHydrated(true)).
    useServerStore.getState().setHydrated(true);

    ensureServerHydrationCeiling();
    scheduled[0].cb();

    assert.equal(useServerStore.getState().hydrated, true);
});

test('markServerHydratedFailsafe flips a stuck hydration and is idempotent', () => {
    markServerHydratedFailsafe('post-hydrate');
    assert.equal(useServerStore.getState().hydrated, true);

    // Calling again after it is already set is a safe no-op.
    assert.doesNotThrow(() => markServerHydratedFailsafe('post-hydrate'));
    assert.equal(useServerStore.getState().hydrated, true);
});
