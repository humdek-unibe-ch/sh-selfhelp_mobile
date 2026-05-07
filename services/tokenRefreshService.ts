/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Single source of truth for refresh-token exchange.
 *
 * The backend rotates the refresh token on every successful call
 * (`processRefreshToken` removes the old `RefreshToken` row and creates
 * a new one). That means the same refresh token can only be used once,
 * so racing two refresh calls — for example the cold-start auth
 * bootstrap **and** a 401 from a parallel CMS request — would
 * deterministically lose the session: the loser hits a 401 and
 * `clearAuthSession()` wipes the refresh token from storage.
 *
 * To avoid that, every refresh — bootstrap or 401-retry — goes through
 * `refreshAccessToken()`. The first caller starts the network call and
 * the rotated token is persisted before any other code can read it.
 * Subsequent callers join the same in-flight promise. React StrictMode,
 * the SessionSync provider, and the axios interceptor can all call this
 * concurrently without burning a token.
 *
 * On a credential rejection (400 / 401 / 403) we clear the auth session
 * once. Network / 5xx failures keep the refresh token so the next
 * launch (or the next 401) can recover.
 */

import {
    CLIENT_TYPE_MOBILE,
    ENDPOINTS,
    HEADER_CLIENT_TYPE,
    type IRefreshSuccessResponse,
} from '@selfhelp/shared';
import axios, { AxiosError } from 'axios';

import { SECURE_STORE_KEYS } from '@/constants/secureStore';
import { secureStore } from '@/services/secureStore';
import { debugLogger } from '@/services/debugLogger';
import { clearAuthSession } from '@/services/sessionService';
import { useAuthStore } from '@/stores/authStore';
import { useServerStore } from '@/stores/serverStore';

const REFRESH_TIMEOUT_MS = 7_000;

let inFlight: Promise<string | null> | null = null;

/**
 * Run a single refresh round-trip. Returns the new access token, or
 * `null` if no refresh token was stored / the backend rejected it.
 */
export function refreshAccessToken(): Promise<string | null> {
    if (inFlight) return inFlight;

    inFlight = (async () => {
        try {
            const baseURL = useServerStore.getState().serverUrl;
            if (!baseURL) {
                debugLogger.warn('refresh skipped — no server URL', 'tokenRefresh');
                return null;
            }

            const refreshToken = await secureStore
                .get(SECURE_STORE_KEYS.REFRESH_TOKEN)
                .catch(() => null);
            if (!refreshToken) {
                debugLogger.info('refresh skipped — no stored refresh token', 'tokenRefresh');
                // Don't wipe the (already-empty) session; just signal the
                // caller that there's nothing to refresh. The auth store
                // is already in its anonymous state by this point.
                useAuthStore.getState().clear();
                return null;
            }

            const startedAt = Date.now();
            debugLogger.info(
                `→ POST ${baseURL}${ENDPOINTS.AUTH.REFRESH}`,
                'api',
                { authenticated: false, refreshTokenSuffix: refreshToken.slice(-6) }
            );
            const response = await axios.post<IRefreshSuccessResponse>(
                `${baseURL}${ENDPOINTS.AUTH.REFRESH}`,
                { refresh_token: refreshToken },
                {
                    headers: { [HEADER_CLIENT_TYPE]: CLIENT_TYPE_MOBILE },
                    timeout: REFRESH_TIMEOUT_MS,
                }
            );
            debugLogger.info(
                `← ${response.status} POST ${baseURL}${ENDPOINTS.AUTH.REFRESH} (${
                    Date.now() - startedAt
                }ms)`,
                'api'
            );

            const next = response.data.data;
            const newAccess = next?.access_token ?? null;
            if (!newAccess) {
                debugLogger.warn('refresh response missing access_token', 'tokenRefresh');
                await clearAuthSession({ clearQueries: true, reason: 'refresh-no-access-token' });
                return null;
            }

            // Persist the rotated refresh token BEFORE other readers see
            // the new access token in memory. Otherwise a parallel
            // request could trigger a second refresh with the (now
            // invalid) old token and the backend would reject it.
            if (next?.refresh_token) {
                try {
                    await secureStore.set(SECURE_STORE_KEYS.REFRESH_TOKEN, next.refresh_token);
                } catch (e) {
                    debugLogger.warn(
                        `refresh token persistence failed: ${(e as Error).message}`,
                        'tokenRefresh'
                    );
                }
            }

            useAuthStore.getState().setAccessToken(newAccess);
            debugLogger.info('refresh ok', 'tokenRefresh');
            return newAccess;
        } catch (e) {
            const status = e instanceof AxiosError ? e.response?.status : undefined;
            const credentialRejected = status === 400 || status === 401 || status === 403;
            debugLogger.warn(
                `refresh failed (${status ?? 'no-status'}): ${(e as Error).message}`,
                'tokenRefresh'
            );
            if (credentialRejected) {
                await clearAuthSession({
                    clearQueries: true,
                    reason: `refresh-rejected-${status ?? 'unknown'}`,
                });
            }
            return null;
        } finally {
            inFlight = null;
        }
    })();

    return inFlight;
}

/** Test/internal helper — clear the in-flight singleton. */
export function _resetRefreshInFlight(): void {
    inFlight = null;
}
