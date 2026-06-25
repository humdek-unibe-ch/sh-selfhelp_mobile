/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Session-scoped persistence for the mobile web-preview embed contract.
 *
 * The boot entry (`config/webPreviewBoot.ts`) strips the one-time
 * `previewSession` code from the address bar BEFORE expo-router's web linking
 * reads it — left in the URL it destabilises expo-router's state<->URL
 * round-trip and floods `history.pushState`, which Chromium throttles
 * ("Throttling navigation to prevent the browser from hanging") and the
 * embedded pane hangs on "Starting up…". The full embed query is retained only
 * in `sessionStorage` (same lifetime as the preview tab) so a document reload or
 * Fast Refresh module reset can still recover the one-time-code discriminator,
 * backend override, draft flag, language, and preview-bridge origin. The raw
 * query is always reparsed through the normal contract parser before use.
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

interface IPreviewSessionCleanup {
    /** Full query to persist for later recovery, or null when there is nothing worth keeping. */
    persistSearch: string | null;
    /** The query string to leave in the address bar, with `previewSession` removed. */
    cleanedSearch: string;
}

/**
 * Pure decision for the boot-time URL cleanup.
 *
 * Returns `null` when the URL has no `previewSession` (nothing to do). Otherwise
 * it returns the query to persist — the FULL embed query, but only when it is a
 * valid embed contract (`embed` + `previewSession`), so the runtime can recover
 * the one-time code for the token exchange — and the `previewSession`-stripped
 * query to write back to the address bar.
 *
 * `previewSession` is always removed when present (a one-time code must never
 * linger in history, and its presence is what trips expo-router's web linking
 * into the navigation flood). The other embed params (`embed`, `keyword`,
 * `modal`, `previewShell`, …) are stable under expo-router and are left in place.
 */
export function planPreviewSessionCleanup(search: string): IPreviewSessionCleanup | null {
    const params = new URLSearchParams(search);
    if (!params.has('previewSession')) return null;

    const persistSearch = isPreviewSessionSearch(search) ? search : null;
    params.delete('previewSession');
    const rest = params.toString();
    return { persistSearch, cleanedSearch: rest ? `?${rest}` : '' };
}

/**
 * Boot-time (web) capture + URL cleanup for the embed one-time code.
 *
 * MUST run before expo-router's web linking initializes (it reads
 * `window.location` synchronously as the entry module evaluates) — see
 * `config/webPreviewBoot.ts`, imported ahead of `expo-router/entry` from the
 * custom `index.js` entry. Persists the full embed query to `sessionStorage`
 * (so `resolveWebPreviewSearch` can still recover `previewSession` for the token
 * exchange) and removes `previewSession` from the address bar with
 * `replaceState` (never `pushState`, so no history entry is added).
 *
 * No-op on native / SSR (no `window`), on a non-preview query, or when
 * History/URL is unavailable; every step is best-effort and never throws.
 */
export function capturePreviewSessionFromUrl(): void {
    if (typeof window === 'undefined' || !window.location || !window.history) return;

    const plan = planPreviewSessionCleanup(window.location.search ?? '');
    if (!plan) return;

    if (plan.persistSearch) {
        try {
            const storage = window.sessionStorage ?? null;
            if (storage) {
                const snapshot: IWebPreviewSessionSnapshot = {
                    version: 1,
                    search: plan.persistSearch,
                };
                storage.setItem(WEB_PREVIEW_SESSION_KEY, JSON.stringify(snapshot));
            }
        } catch {
            // Best-effort: the exchange can still run from the URL on this load.
        }
    }

    try {
        const { pathname, hash } = window.location;
        window.history.replaceState(
            window.history.state,
            '',
            `${pathname}${plan.cleanedSearch}${hash}`,
        );
    } catch {
        // Best-effort: leaving the param is the pre-fix behaviour.
    }
}
