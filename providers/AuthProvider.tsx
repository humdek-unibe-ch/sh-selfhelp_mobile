/**
 * Bootstraps auth state on app launch.
 *
 * Reads the refresh token from SecureStore (native) or localStorage (web
 * preview) and exchanges it for a fresh access token + user payload.
 *
 * This runs *after* the server URL is resolved by `ServerProvider`. We
 * subscribe to the server store so a hard browser reload (where the
 * server URL is hydrated asynchronously from localStorage) still triggers
 * the refresh flow exactly once, instead of bailing out when `serverUrl`
 * is momentarily `null`.
 */

import { useEffect, type ReactNode } from 'react';

import {
    CLIENT_TYPE_MOBILE,
    ENDPOINTS,
    HEADER_CLIENT_TYPE,
    type IRefreshSuccessResponse,
    type IUserDataResponse,
} from '@selfhelp/shared';
import axios from 'axios';

import { SECURE_STORE_KEYS } from '@/constants/secureStore';
import { secureStore } from '@/services/secureStore';
import { useAuthStore } from '@/stores/authStore';
import { useServerStore } from '@/stores/serverStore';

interface IAuthProviderProps {
    children: ReactNode;
}

async function bootstrapWith(baseURL: string, abort: () => boolean): Promise<void> {
    const refreshToken = await secureStore.get(SECURE_STORE_KEYS.REFRESH_TOKEN);
    if (!refreshToken) {
        if (!abort()) useAuthStore.getState().setBootstrapped(true);
        return;
    }

    try {
        const refresh = await axios.post<IRefreshSuccessResponse>(
            `${baseURL}${ENDPOINTS.AUTH.REFRESH}`,
            { refresh_token: refreshToken },
            { headers: { [HEADER_CLIENT_TYPE]: CLIENT_TYPE_MOBILE } }
        );

        const accessToken = refresh.data.data?.access_token;
        if (!accessToken) {
            await secureStore.remove(SECURE_STORE_KEYS.REFRESH_TOKEN);
            if (!abort()) useAuthStore.getState().setBootstrapped(true);
            return;
        }

        if (refresh.data.data?.refresh_token) {
            await secureStore.set(SECURE_STORE_KEYS.REFRESH_TOKEN, refresh.data.data.refresh_token);
        }
        useAuthStore.getState().setAccessToken(accessToken);

        const me = await axios.get<IUserDataResponse>(`${baseURL}${ENDPOINTS.AUTH.USER_DATA}`, {
            headers: {
                [HEADER_CLIENT_TYPE]: CLIENT_TYPE_MOBILE,
                Authorization: `Bearer ${accessToken}`,
            },
        });
        if (!abort() && me.data.data) {
            useAuthStore.getState().setUser(me.data.data);
        }
    } catch {
        await secureStore.remove(SECURE_STORE_KEYS.REFRESH_TOKEN);
        if (!abort()) useAuthStore.getState().clear();
    } finally {
        if (!abort()) useAuthStore.getState().setBootstrapped(true);
    }
}

export function AuthProvider({ children }: IAuthProviderProps): ReactNode {
    useEffect(() => {
        let cancelled = false;
        let started = false;

        const tryBootstrap = (baseURL: string | null): void => {
            if (started || cancelled) return;
            if (!baseURL) return;
            started = true;
            void bootstrapWith(baseURL, () => cancelled);
        };

        // Run immediately if the URL is already known (warm reload, baked URL).
        tryBootstrap(useServerStore.getState().serverUrl);

        // Otherwise wait for ServerProvider to hydrate it.
        const unsubscribe = useServerStore.subscribe((state) => {
            tryBootstrap(state.serverUrl);
        });

        // Failsafe: if no server URL appears within a tick, mark bootstrapped
        // so the gate controller can route the user to the picker.
        const failsafe = setTimeout(() => {
            if (!started && !cancelled) {
                useAuthStore.getState().setBootstrapped(true);
            }
        }, 1500);

        return () => {
            cancelled = true;
            clearTimeout(failsafe);
            unsubscribe();
        };
    }, []);

    return children;
}
