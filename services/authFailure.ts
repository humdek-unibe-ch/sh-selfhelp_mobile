/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import { getRateLimitRetryAfter } from '@selfhelp/shared';

export type TAuthFailure =
    /** Backend 429 from the brute-force limiter; `retryAfter` in seconds. */
    | { kind: 'rate-limited'; retryAfter: number }
    | { kind: 'error'; message: string };

/**
 * Turn an error thrown by an auth request into the result the auth screens
 * render: a backend `429` becomes `rate-limited` (so the CMS
 * `alert_rate_limited` text is shown), anything else a plain error message.
 */
export function authFailure(e: unknown): TAuthFailure {
    const retryAfter = getRateLimitRetryAfter(e);
    if (retryAfter !== null) return { kind: 'rate-limited', retryAfter };

    return { kind: 'error', message: e instanceof Error ? e.message : String(e) };
}
