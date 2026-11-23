/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * What a page screen shows (live-sync decision "Lost access: banner, no kick-out").
 *
 * A page the person already sees is read again when the server says something changed. If that read is
 * refused because the person lost the page (401, 403, 404), the page stays on screen with a notice until they
 * navigate: the screen is not pulled away under their hands, and the server still refuses their next write. Any
 * other failed read of a page that is on screen keeps the page too (a flaky network must not blank it). Only a
 * page that never loaded shows an error screen.
 *
 * Pure (no React Native), so `node --test` covers it.
 */

export type TPageScreenOutcome =
    /** The first read is running. */
    | 'loading'
    /** The page (the last one read) is drawn. */
    | 'page'
    /** The page is drawn with the notice that the person may no longer view it. */
    | 'page-lost-access'
    /** There is no page to draw: the error screen. */
    | 'error';

/** The statuses that say the person may no longer see the page. */
const LOST_ACCESS_STATUSES: readonly number[] = [401, 403, 404];

export function pageScreenOutcome(state: {
    isLoading: boolean;
    hasData: boolean;
    /** The HTTP status of the last failed read, or null. */
    status: number | null;
    hasError: boolean;
}): TPageScreenOutcome {
    if (state.isLoading) {
        return 'loading';
    }
    if (!state.hasData) {
        return 'error';
    }
    if (state.hasError && state.status !== null && LOST_ACCESS_STATUSES.includes(state.status)) {
        return 'page-lost-access';
    }
    return 'page';
}
