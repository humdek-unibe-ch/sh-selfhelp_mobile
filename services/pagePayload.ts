/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * The page the app keeps from a page response.
 *
 * The backend answers `{ data: { page, sync } }`: the live-sync block (contract C6) sits next to the
 * page, not inside it. `syncApply.ts` and the `valid_until` timer read it from the cached page, so
 * the page fetchers keep it with the page. Without it a `changed` message names a page that no
 * cached payload claims, and no open screen is read again.
 */
import type { IPageContent, ISyncBlock } from '@selfhelp/shared';

/** The `data` of a page response (`/pages/by-keyword`, `/pages/resolve`). */
export interface IPagePayload {
    page?: IPageContent | null;
    sync?: ISyncBlock | null;
}

/** The page of a response's `data`, carrying the response's `sync` block. `null` when the response has no page. */
export function pageFromPayload(payload: IPagePayload | null | undefined): IPageContent | null {
    const page = payload?.page;
    if (!page) {
        return null;
    }
    const sync = payload.sync ?? page.sync;
    return sync ? { ...page, sync } : page;
}
