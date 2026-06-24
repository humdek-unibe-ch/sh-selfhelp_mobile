/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Session-scoped persistence for the mobile web-preview embed contract.
 *
 * Expo Router intentionally replaces the initial iframe URL with the rendered
 * CMS route, which drops the preview query string. A document reload or Fast
 * Refresh module reset must still recover the one-time-code discriminator,
 * backend override, draft flag, language, and preview-bridge origin. The raw
 * query is retained only in `sessionStorage` (same lifetime as the preview tab)
 * and is always reparsed through the normal contract parser before use.
 */

import { parseWebPreviewParams } from '@/config/webPreviewContract';

interface IWebPreviewStorage {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
    removeItem(key: string): void;
}

interface IWebPreviewSessionSnapshot {
    version: 1;
    search: string;
}

export const WEB_PREVIEW_SESSION_KEY = 'sh_web_preview_runtime_v1';

function isPreviewSessionSearch(search: string): boolean {
    const params = parseWebPreviewParams(search);
    return params.embed && typeof params.previewSession === 'string' && params.previewSession !== '';
}

function readStoredSearch(storage: IWebPreviewStorage): string | null {
    try {
        const raw = storage.getItem(WEB_PREVIEW_SESSION_KEY);
        if (!raw) return null;
        const snapshot = JSON.parse(raw) as Partial<IWebPreviewSessionSnapshot>;
        if (snapshot.version !== 1 || typeof snapshot.search !== 'string') {
            storage.removeItem(WEB_PREVIEW_SESSION_KEY);
            return null;
        }
        if (!isPreviewSessionSearch(snapshot.search)) {
            storage.removeItem(WEB_PREVIEW_SESSION_KEY);
            return null;
        }
        return snapshot.search;
    } catch {
        return null;
    }
}

/**
 * Return the active preview query string.
 *
 * A fresh iframe URL wins and replaces the stored snapshot. Once Expo Router
 * drops that query, embedded reloads recover the prior validated query. A
 * top-level browser tab never restores an iframe session.
 */
export function resolveWebPreviewSearch(
    currentSearch: string,
    storage: IWebPreviewStorage | null,
    isEmbeddedWindow: boolean,
): string {
    if (isPreviewSessionSearch(currentSearch)) {
        if (storage) {
            const snapshot: IWebPreviewSessionSnapshot = {
                version: 1,
                search: currentSearch,
            };
            try {
                storage.setItem(WEB_PREVIEW_SESSION_KEY, JSON.stringify(snapshot));
            } catch {
                // Storage is best-effort; the current load can still continue.
            }
        }
        return currentSearch;
    }

    if (!storage || !isEmbeddedWindow) return currentSearch;
    return readStoredSearch(storage) ?? currentSearch;
}
