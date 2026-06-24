/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Mobile preview-session exchange.
 *
 * The web-preview image boots with a ONE-TIME code in its iframe URL
 * (`previewSession=<code>`). This service POSTs that code to the public
 * exchange endpoint (proxied to the private backend through
 * `/mobile-preview/api`) and receives a short-lived scoped JWT
 * (`purpose: 'mobile_preview'`) plus the previewed user.
 *
 * RELOAD RESILIENCE — the exchange is SINGLE-USE: the backend deletes the code
 * on first read, so re-exchanging the same code after a full page reload (Expo
 * Web HMR fast-refresh, a manual reload, or an in-app re-auth) fails with a 401
 * and the preview pane would go blank. To keep reloads smooth, the exchanged
 * scoped token is cached in `sessionStorage` keyed by the code (web only, wiped
 * when the tab closes); a reload with the SAME code reuses it instead of
 * re-exchanging, while a new code (the CMS re-mints on draft/language/refresh)
 * triggers a fresh exchange. This caches a short-lived, read-only PREVIEW token
 * only — never the admin JWT, which still never reaches the iframe.
 *
 * Raw axios is used deliberately (like login/refresh) so the apiClient
 * interceptors — which assume a normal session + refresh token — do not run on
 * this one-shot bootstrap call.
 */

import axios from 'axios';
import {
    CLIENT_TYPE_MOBILE,
    HEADER_CLIENT_TYPE,
    MOBILE_PREVIEW_ENDPOINTS,
    type IMobilePreviewExchangeResponse,
    type IUserData,
} from '@selfhelp/shared';

export interface IPreviewSessionResult {
    accessToken: string;
    expiresIn: number;
    user: IUserData;
}

/**
 * Exchange a one-time preview code for a scoped session. Returns `null` when
 * the response is malformed or the code is rejected.
 */
export async function exchangePreviewSession(
    apiBase: string,
    code: string,
): Promise<IPreviewSessionResult | null> {
    const url = `${apiBase.replace(/\/+$/, '')}${MOBILE_PREVIEW_ENDPOINTS.EXCHANGE}`;
    const response = await axios.post<Partial<IMobilePreviewExchangeResponse>>(
        url,
        { code },
        {
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                [HEADER_CLIENT_TYPE]: CLIENT_TYPE_MOBILE,
            },
            timeout: 10_000,
        },
    );

    const data = response.data?.data;
    if (!data || typeof data.access_token !== 'string' || data.access_token === '') {
        return null;
    }

    return {
        accessToken: data.access_token,
        expiresIn: typeof data.expires_in === 'number' ? data.expires_in : 0,
        user: data.user,
    };
}

/** sessionStorage key for the cached, reload-resilient preview session. */
const PREVIEW_SESSION_CACHE_KEY = 'sh_preview_session';
/** Treat a token as expired this many ms early to avoid a race near the edge. */
const PREVIEW_SESSION_SKEW_MS = 5_000;
/** Fallback lifetime when the exchange did not report `expires_in`. */
const PREVIEW_SESSION_FALLBACK_MS = 5 * 60_000;

interface ICachedPreviewSession extends IPreviewSessionResult {
    /** The one-time code this token was exchanged from (cache discriminator). */
    code: string;
    /** Absolute expiry (ms epoch) derived from `expiresIn`. */
    expiresAtMs: number;
}

function previewSessionStorage(): Storage | null {
    try {
        if (typeof window === 'undefined') return null;
        return window.sessionStorage ?? null;
    } catch {
        return null;
    }
}

/**
 * Return the cached preview session iff it was exchanged from THIS `code` and
 * has not expired. A reload reuses it instead of re-exchanging the (already
 * consumed) one-time code. Returns `null` on a miss / parse error / expiry.
 */
export function readCachedPreviewSession(code: string): IPreviewSessionResult | null {
    const storage = previewSessionStorage();
    if (!storage || code === '') return null;
    try {
        const raw = storage.getItem(PREVIEW_SESSION_CACHE_KEY);
        if (!raw) return null;
        const cached = JSON.parse(raw) as Partial<ICachedPreviewSession>;
        if (
            cached.code !== code ||
            typeof cached.accessToken !== 'string' ||
            cached.accessToken === '' ||
            !cached.user ||
            typeof cached.expiresAtMs !== 'number' ||
            Date.now() >= cached.expiresAtMs - PREVIEW_SESSION_SKEW_MS
        ) {
            return null;
        }
        return { accessToken: cached.accessToken, expiresIn: cached.expiresIn ?? 0, user: cached.user };
    } catch {
        return null;
    }
}

/** Persist a freshly exchanged preview session keyed by its one-time code. */
export function writeCachedPreviewSession(code: string, session: IPreviewSessionResult): void {
    const storage = previewSessionStorage();
    if (!storage || code === '') return;
    const lifetimeMs = session.expiresIn > 0 ? session.expiresIn * 1_000 : PREVIEW_SESSION_FALLBACK_MS;
    const payload: ICachedPreviewSession = {
        ...session,
        code,
        expiresAtMs: Date.now() + lifetimeMs,
    };
    try {
        storage.setItem(PREVIEW_SESSION_CACHE_KEY, JSON.stringify(payload));
    } catch {
        // Best-effort cache; a storage failure just means a reload re-exchanges.
    }
}
