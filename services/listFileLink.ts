/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Recognise a section-scoped list-file URL the server put in `__links` HTML and
 * turn it into the authenticated current-file request. The app never builds the
 * path; it only parses what the page already received.
 */
import { ENDPOINTS } from '@selfhelp/shared';

/** Target for downloading the current file of a record (not a historical version). */
export interface ICurrentFileTarget {
    sectionId: number;
    recordId: number;
    fieldKey: string;
    pageId: number;
    index: number;
    languageId?: number;
    preview?: boolean;
}

/**
 * Match `/lists/{section}/records/{record}/files/{field}?page_id=…&index=…`
 * (optional `/cms-api/v1` prefix and absolute URL with the same path).
 */
const LIST_FILE_HREF =
    /(?:^|\/)(?:cms-api\/v1\/)?lists\/(\d+)\/records\/(\d+)\/files\/([^/?#]+)(?:\?([^#]*))?$/i;

/** True when the href is a section-scoped list-file URL from the server. */
export function isListFileHref(href: string): boolean {
    return parseListFileHref(href) !== null;
}

/**
 * Parse a list-file href into the current-file download target.
 * Returns null for any other URL (keep Linking.openURL).
 */
export function parseListFileHref(href: string): ICurrentFileTarget | null {
    const trimmed = href.trim();
    if (trimmed === '') {
        return null;
    }
    let pathAndQuery = trimmed;
    try {
        if (/^https?:\/\//i.test(trimmed)) {
            const url = new URL(trimmed);
            pathAndQuery = `${url.pathname}${url.search}`;
        }
    } catch {
        return null;
    }
    const normalized = pathAndQuery.startsWith('/') ? pathAndQuery.slice(1) : pathAndQuery;
    const match = LIST_FILE_HREF.exec(`/${normalized}`);
    if (!match) {
        return null;
    }
    const sectionId = Number(match[1]);
    const recordId = Number(match[2]);
    const fieldKey = decodeURIComponent(match[3]);
    const query = new URLSearchParams(match[4] ?? '');
    const pageId = Number(query.get('page_id') ?? '');
    const index = Number(query.get('index') ?? '0');
    if (!Number.isFinite(sectionId) || sectionId <= 0) {
        return null;
    }
    if (!Number.isFinite(recordId) || recordId <= 0) {
        return null;
    }
    if (fieldKey === '') {
        return null;
    }
    if (!Number.isFinite(pageId) || pageId <= 0) {
        return null;
    }
    const languageRaw = query.get('file_language');
    const languageId = languageRaw !== null ? Number(languageRaw) : undefined;
    const preview = query.get('preview') === '1';

    return {
        sectionId,
        recordId,
        fieldKey,
        pageId,
        index: Number.isFinite(index) && index >= 0 ? index : 0,
        ...(languageId !== undefined && Number.isFinite(languageId) && languageId > 0
            ? { languageId }
            : {}),
        ...(preview ? { preview: true } : {}),
    };
}

/** The request for one current list file: shared route + query. */
export function currentFileRequest(target: ICurrentFileTarget): { url: string; params: Record<string, string> } {
    const params: Record<string, string> = {
        page_id: String(target.pageId),
        index: String(Math.max(0, target.index)),
    };
    if (target.languageId !== undefined && target.languageId > 0) {
        params.file_language = String(target.languageId);
    }
    if (target.preview) {
        params.preview = '1';
    }

    return {
        url: ENDPOINTS.LISTS.CURRENT_FILE(target.sectionId, target.recordId, target.fieldKey),
        params,
    };
}
