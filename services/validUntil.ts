/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * The page's own clock (contract C6): a page payload may say `sync.valid_until`, the earliest moment the
 * result can change because time passes ("show after 1 December"). The open page is read again once, at that
 * moment plus a random delay of up to 2 seconds. This is not polling: the timer fires once, at a moment the
 * server named, and the next one is armed only from the answer the read brings.
 *
 * Pure: the clock, the random source and the timers are injected, so `node --test` covers it.
 */
import { syncRefetchDelayMs } from '@selfhelp/shared';

/** The longest delay a platform timer holds reliably (a 32-bit signed integer of milliseconds). */
export const MAX_TIMER_MS = 2_147_483_647;

/**
 * A read that follows a `valid_until` read never comes sooner than this, however the answer reads. A device
 * clock that runs ahead of the server's would otherwise see every new `valid_until` already in the past and read
 * again and again.
 */
export const MIN_REARM_GAP_MS = 60_000;

export interface IValidUntilDeps {
    now: () => number;
    random?: () => number;
    setTimer?: (callback: () => void, ms: number) => unknown;
    clearTimer?: (handle: unknown) => void;
}

export interface IValidUntilRequest {
    /** `sync.valid_until` of the page on screen (UTC ISO 8601), or null. */
    validUntil: string | null | undefined;
    /** True while the app is open in the foreground. */
    isForeground: () => boolean;
    /** Read the page again. */
    refetch: () => void;
    /** When the last `valid_until` read ran (ms since epoch), or null. */
    lastFiredAt?: number | null;
    /** Called when the read is made, with the time it was made at. */
    onFired?: (at: number) => void;
}

/** The moment `valid_until` names, in milliseconds since the epoch; null when it is empty or unreadable. */
export function validUntilMs(validUntil: string | null | undefined): number | null {
    if (typeof validUntil !== 'string' || validUntil === '') {
        return null;
    }
    const ms = Date.parse(validUntil);
    return Number.isFinite(ms) ? ms : null;
}

/** Milliseconds from `now` until the read is due, or null when the page has no `valid_until`. */
export function validUntilDelayMs(
    validUntil: string | null | undefined,
    now: number,
    random: () => number = Math.random,
    lastFiredAt: number | null = null,
): number | null {
    const at = validUntilMs(validUntil);
    if (at === null) {
        return null;
    }
    let delay = Math.max(0, at - now) + syncRefetchDelayMs('valid_until', random);
    if (lastFiredAt !== null) {
        delay = Math.max(delay, lastFiredAt + MIN_REARM_GAP_MS - now);
    }
    return Math.max(0, delay);
}

/**
 * Arm the one read at `valid_until`. Returns a function that disarms it (the page is left). A page without
 * `valid_until` arms nothing. A timer that fires while the app is in the background reads nothing: the return
 * to the foreground reads everything on screen again.
 */
export function scheduleValidUntilRefetch(request: IValidUntilRequest, deps: IValidUntilDeps): () => void {
    const random = deps.random ?? Math.random;
    const setTimer = deps.setTimer ?? ((callback, ms) => setTimeout(callback, ms));
    const clearTimer = deps.clearTimer ?? ((handle) => clearTimeout(handle as ReturnType<typeof setTimeout>));

    const total = validUntilDelayMs(request.validUntil, deps.now(), random, request.lastFiredAt ?? null);
    if (total === null) {
        return () => undefined;
    }

    let handle: unknown = null;
    let cancelled = false;
    const dueAt = deps.now() + total;

    const arm = (): void => {
        const remaining = dueAt - deps.now();
        if (remaining <= 0) {
            handle = null;
            if (!cancelled && request.isForeground()) {
                const at = deps.now();
                request.onFired?.(at);
                request.refetch();
            }
            return;
        }
        // A far-off moment is reached in steps: a single timer cannot hold it.
        handle = setTimer(arm, Math.min(remaining, MAX_TIMER_MS));
    };
    arm();

    return () => {
        cancelled = true;
        if (handle !== null) {
            clearTimer(handle);
            handle = null;
        }
    };
}
