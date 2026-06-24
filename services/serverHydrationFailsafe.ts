/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Hard failsafe for the server-store hydration, mirroring {@link AuthProvider}'s
 * bootstrap ceiling.
 *
 * The root splash gate is `ready = serverHydrated && (!serverUrl || bootstrapped)`
 * (see `app/_layout.tsx`). `AuthProvider` already guarantees `bootstrapped` flips
 * within a hard ceiling, but NOTHING guaranteed `serverHydrated`: if
 * `ServerProvider.hydrateServerStore()` rejected (an exception on any path before
 * `setHydrated(true)`) or silently hung (a wedged dev preview-session exchange, or
 * an HMR / Metro hiccup on a rapid in-iframe reload), `serverHydrated` stayed
 * `false` forever and the app stranded on the "Starting up…" splash — exactly the
 * CMS Live Preview "reload never finishes" symptom.
 *
 * These helpers guarantee the splash always releases: an idempotent ceiling timer
 * and a `markServerHydratedFailsafe()` that flips `hydrated` once (no-op if it is
 * already set, so a normal fast hydration never logs or double-fires).
 */

import { debugLogger } from '@/services/debugLogger';
import { useServerStore } from '@/stores/serverStore';

export const HYDRATION_CEILING_MS = 8_000;

let ceilingScheduled = false;

/**
 * Flip `serverHydrated` to `true` exactly once. A no-op when hydration already
 * completed normally, so the happy path neither logs nor re-renders.
 */
export function markServerHydratedFailsafe(reason: string): void {
    if (useServerStore.getState().hydrated) return;
    debugLogger.warn(`server hydration failsafe (${reason}) — releasing splash`, 'ServerProvider');
    useServerStore.getState().setHydrated(true);
}

/**
 * Arm a single ceiling timer that releases the splash if hydration has not
 * completed within {@link HYDRATION_CEILING_MS}. Idempotent: repeated calls (e.g.
 * provider re-mounts) reuse the one timer for the lifetime of the app.
 */
export function ensureServerHydrationCeiling(): void {
    if (ceilingScheduled) return;
    ceilingScheduled = true;
    setTimeout(() => markServerHydratedFailsafe('ceiling'), HYDRATION_CEILING_MS);
}

/** Test-only: reset the module-level ceiling guard between unit tests. */
export function _resetServerHydrationCeiling(): void {
    ceilingScheduled = false;
}
