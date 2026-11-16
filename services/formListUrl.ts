/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * The URL of one read of a list's state (`GET /cms-api/v1/lists/{section_id}/state`).
 * Pure (no React Native, no network), so `node --test` covers the exact request.
 */
import { ENDPOINTS, formListRouteQuery } from '@selfhelp/shared';

/** What one read of a list's state asks for. */
export interface IFormListStateRequest {
    /** The page the list is on (the server checks that the list belongs to it). */
    pageId: number;
    /** The visitor's language; omitted = the server's default for the account. */
    languageId?: number | null;
    /** The `<key>.*` URL parameters of the state to read, already percent-encoded (no leading `?`). */
    listQuery: string;
    /** Preview mode of an authorized editor. */
    preview?: boolean;
    /**
     * The declared route parameters of the page (`page.route_params`, e.g. `{ record_id: '3' }`). A record
     * template can read `{{route.record_id}}`; the server checks them against the routes of that page.
     */
    route?: Readonly<Record<string, string | undefined>> | null;
}

/** The URL of one read of a list's state. Built by hand: the list parameters keep the dot of `news.q`. */
export function formListStateUrl(sectionId: number, request: IFormListStateRequest): string {
    const parts = [`page_id=${encodeURIComponent(String(request.pageId))}`];
    if (request.languageId) {
        parts.push(`language_id=${encodeURIComponent(String(request.languageId))}`);
    }
    if (request.preview) {
        parts.push('preview=1');
    }
    // Already percent-encoded (`route%5Brecord_id%5D=3`), sorted by name, limited like the server limits it.
    const route = formListRouteQuery(request.route);
    if (route !== '') {
        parts.push(route);
    }
    if (request.listQuery !== '') {
        parts.push(request.listQuery);
    }
    return `${ENDPOINTS.LISTS.STATE(sectionId)}?${parts.join('&')}`;
}
