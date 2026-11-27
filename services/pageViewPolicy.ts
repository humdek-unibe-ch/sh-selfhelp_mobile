/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * When a page fetch counts as a page view (contract C7, finding F135).
 *
 * The backend records a view only when the request carries `X-Page-View: 1`. The app sends it on exactly one
 * fetch per opening of a page screen: the first fetch of that page by that screen. It never sends it on a
 * refetch caused by a live message, by `sync.valid_until`, by an access change or by a return to the
 * foreground, nor in preview mode (a draft is not a visit).
 *
 * Pure (no React Native), so `node --test` covers it.
 */
import { HEADER_PAGE_VIEW } from '@selfhelp/shared';

export interface IPageViewDecision {
    /** The caller is a screen that opens a page (the login, profile and page screens), not a background reader. */
    countView: boolean;
    /** The draft of the page is requested. */
    preview: boolean;
    /** The identity (`keyword|path`) of the page this screen already counted, or null. */
    countedIdentity: string | null;
    /** The identity of the page being fetched now. */
    identity: string;
}

/** True when this fetch is the view of the opening of the page. */
export function shouldCountPageView(decision: IPageViewDecision): boolean {
    return decision.countView && !decision.preview && decision.countedIdentity !== decision.identity;
}

/** The request headers of a page fetch: the view marker, or nothing. */
export function pageViewHeaders(view: boolean | undefined): Record<string, string> | undefined {
    return view === true ? { [HEADER_PAGE_VIEW]: '1' } : undefined;
}
