/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Auth API helpers used by the login / 2FA / logout components.
 *
 * Every helper does the bare minimum:
 *
 *   - `login()` / `verifyTwoFactor()`:
 *       1. POST credentials to the backend (raw axios, no interceptor
 *          loop — the request is already unauthenticated).
 *       2. Persist the returned refresh token to `secureStore` so
 *          reload survives.
 *       3. Stash the access token + user in memory via `useAuthStore`.
 *       4. Drop every auth-scoped React Query (anonymous `pages`,
 *          `page`, and `user-data`) so the next render fetches with
 *          the new identity. Then refetch `user-data` so the menu /
 *          page renderer has the final permissions before navigating.
 *   - `logout()`: blacklists the access token at the backend (best
 *     effort) and calls `clearAuthSession()` to drop both tokens and
 *     the cache.
 */

import {
    CLIENT_TYPE_MOBILE,
    ENDPOINTS,
    HEADER_CLIENT_TYPE,
    type ILoginRequest,
    type ILoginSuccessResponse,
    type ITwoFactorRequiredResponse,
    type ITwoFactorVerifyRequest,
    type ITwoFactorVerifySuccessResponse,
} from '@selfhelp/shared';
import axios from 'axios';

import { useServerStore } from '@/stores/serverStore';
import { useAuthStore } from '@/stores/authStore';
import { secureStore } from '@/services/secureStore';
import { SECURE_STORE_KEYS } from '@/constants/secureStore';
import { debugLogger } from '@/services/debugLogger';
import { appQueryClient } from '@/services/queryClient';
import { persistAuthSession } from '@/services/authSessionPersistence';
import {
    clearAuthSession,
    invalidateAuthScopedQueries,
    removeAuthScopedQueries,
} from '@/services/sessionService';
import { fetchCurrentUser, userDataQueryKey } from '@/services/userService';

export type TLoginResult =
    | { kind: 'ok' }
    | { kind: '2fa'; userId: number }
    | { kind: 'error'; message: string };

export async function login(payload: ILoginRequest): Promise<TLoginResult> {
    const baseURL = useServerStore.getState().serverUrl;
    if (!baseURL) return { kind: 'error', message: 'No backend selected' };
    try {
        const resp = await axios.post<ILoginSuccessResponse | ITwoFactorRequiredResponse>(
            `${baseURL}${ENDPOINTS.AUTH.LOGIN}`,
            payload,
            { headers: { [HEADER_CLIENT_TYPE]: CLIENT_TYPE_MOBILE } }
        );
        const data = resp.data.data;
        if (data && 'requires_2fa' in data && data.requires_2fa) {
            return { kind: '2fa', userId: data.id_users };
        }
        if (data && 'access_token' in data) {
            await commitAuthSuccess(baseURL, data.access_token, data.refresh_token, data.user);
            return { kind: 'ok' };
        }
        return { kind: 'error', message: resp.data.error ?? 'Unknown error' };
    } catch (e) {
        debugLogger.warn(`login error: ${(e as Error).message}`, 'authService');
        return { kind: 'error', message: (e as Error).message };
    }
}

export async function verifyTwoFactor(payload: ITwoFactorVerifyRequest): Promise<TLoginResult> {
    const baseURL = useServerStore.getState().serverUrl;
    if (!baseURL) return { kind: 'error', message: 'No backend selected' };
    try {
        const resp = await axios.post<ITwoFactorVerifySuccessResponse>(
            `${baseURL}${ENDPOINTS.AUTH.TWO_FACTOR_VERIFY}`,
            payload,
            { headers: { [HEADER_CLIENT_TYPE]: CLIENT_TYPE_MOBILE } }
        );
        const data = resp.data.data;
        if (data?.access_token) {
            await commitAuthSuccess(baseURL, data.access_token, data.refresh_token, data.user);
            return { kind: 'ok' };
        }
        return { kind: 'error', message: resp.data.error ?? 'Unknown error' };
    } catch (e) {
        return { kind: 'error', message: (e as Error).message };
    }
}

export async function logout(): Promise<void> {
    try {
        const baseURL = useServerStore.getState().serverUrl;
        const accessToken = useAuthStore.getState().accessToken;
        const refreshToken = await secureStore.get(SECURE_STORE_KEYS.REFRESH_TOKEN).catch(() => null);
        if (baseURL && accessToken) {
            await axios.post(
                `${baseURL}${ENDPOINTS.AUTH.LOGOUT}`,
                refreshToken ? { refresh_token: refreshToken } : undefined,
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        [HEADER_CLIENT_TYPE]: CLIENT_TYPE_MOBILE,
                    },
                }
            );
        }
    } catch {
        // Ignore — clearing local state is what matters.
    }
    await clearAuthSession({ clearQueries: true, reason: 'logout' });
}

/**
 * Commit a successful auth response (login / 2FA verify) and reset
 * every auth-scoped React Query so the menu / pages reflect the new
 * identity immediately.
 *
 * Order is important:
 *   1. Memorise the access token + user in the auth store.
 *   2. Persist the refresh token. Reloads must survive.
 *   3. Remove any cached `user-data`, `pages`, `page` queries from the
 *      anonymous scope (they'll never serve again because the
 *      authScope segment of the key flips from `anon` to `auth`, but
 *      removing them frees memory and makes the React Query devtools
 *      easier to read).
 *   4. Refetch `user-data` synchronously so the navigation tree has
 *      `acl_version`/permissions before the router redirects.
 *   5. Invalidate `pages` / `page` so any mounted screen refetches
 *      with the user's permissions.
 */
async function commitAuthSuccess(
    baseURL: string,
    accessToken: string,
    refreshToken: string | undefined,
    user: ILoginSuccessResponse['data']['user']
): Promise<void> {
    try {
        await persistAuthSession({ accessToken, refreshToken, serverUrl: baseURL, user });
    } catch (e) {
        debugLogger.warn(
            `login: session persistence failed: ${(e as Error).message}`,
            'authService'
        );
    }

    useAuthStore.getState().setSession(accessToken, user);
    removeAuthScopedQueries();

    try {
        const me = await fetchCurrentUser();
        if (me) {
            useAuthStore.getState().setUser(me);
            appQueryClient.setQueryData(userDataQueryKey(baseURL), me);
        }
    } catch (e) {
        debugLogger.warn(
            `post-login user-data fetch failed: ${(e as Error).message}`,
            'authService'
        );
    }

    invalidateAuthScopedQueries();
}
