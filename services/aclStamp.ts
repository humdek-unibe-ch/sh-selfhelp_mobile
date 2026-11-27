/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * The access stamp (contract C5): the backend adds `X-Acl-Stamp` to every API reply to a signed-in person,
 * and `acl_stamp` to their user data. It changes whenever the person's own access, a group's or a role's
 * changes. A reply whose stamp differs from the one in the user data means the access moved and the push
 * was lost (or is still on its way): the user data is read again, which runs the access cascade.
 *
 * The comparison happens once per new stamp, so a user-data read that is slow, or that returns an older
 * stamp, never turns into a loop of reads.
 *
 * Pure (no React Native); `services/apiClient.ts` feeds it, `hooks/useAclStampWatcher.ts` connects it.
 */
import { ENDPOINTS, HEADER_ACL_STAMP } from '@selfhelp/shared';

export interface IAclStampWatcherDeps {
    /** The stamp in the user data the app holds; null or undefined while it has none (a guest, an older core). */
    known: () => string | null | undefined;
    /** Read the user data again. */
    invalidate: () => void;
}

export interface IAclStampWatcher {
    /** Look at the stamp of one reply (null when the reply carried none). */
    observe: (stamp: string | null) => void;
    /** Forget the stamp that was already acted on (sign-out, server switch). */
    reset: () => void;
}

export function createAclStampWatcher(deps: IAclStampWatcherDeps): IAclStampWatcher {
    let invalidatedFor: string | null = null;

    return {
        observe: (stamp) => {
            if (stamp === null || stamp === '') {
                return;
            }
            const known = deps.known();
            if (known === null || known === undefined) {
                // No user data yet: there is nothing to compare with.
                return;
            }
            if (stamp === known) {
                invalidatedFor = null;
                return;
            }
            if (stamp === invalidatedFor) {
                return;
            }
            invalidatedFor = stamp;
            deps.invalidate();
        },
        reset: () => {
            invalidatedFor = null;
        },
    };
}

/** The stamp of an axios reply: `AxiosHeaders` answers `get`, a plain object holds lower-case names. */
export function readAclStamp(headers: unknown): string | null {
    if (typeof headers !== 'object' || headers === null) {
        return null;
    }
    const getter = (headers as { get?: unknown }).get;
    let value: unknown;
    if (typeof getter === 'function') {
        value = (getter as (name: string) => unknown).call(headers, HEADER_ACL_STAMP);
    }
    if (value === undefined || value === null) {
        value = (headers as Record<string, unknown>)[HEADER_ACL_STAMP.toLowerCase()];
    }
    return typeof value === 'string' && value !== '' ? value : null;
}

let activeWatcher: IAclStampWatcher | null = null;

/** The one watcher the app uses; `null` removes it. */
export function setAclStampWatcher(watcher: IAclStampWatcher | null): void {
    activeWatcher = watcher;
}

/**
 * Called by the API client with every reply's headers. The reply that carries the user data itself is skipped:
 * its body is the answer to the question the stamp raises.
 */
export function observeAclStampHeaders(headers: unknown, url?: string): void {
    if (typeof url === 'string' && url.split('?')[0].endsWith(ENDPOINTS.AUTH.USER_DATA)) {
        return;
    }
    activeWatcher?.observe(readAclStamp(headers));
}
