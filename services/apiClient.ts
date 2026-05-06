/**
 * Axios instance shared across the app.
 *
 * - baseURL is wired from `useServerStore.serverUrl` at provider mount.
 * - `X-Client-Type: mobile` header is attached on every request so the
 *   backend filters pages and evaluates conditions for the mobile platform.
 * - Access token (in-memory) is added if present.
 * - On 401, attempts a single refresh using the SecureStore-stored
 *   refresh token; if that succeeds the original request is retried,
 *   otherwise the auth store is cleared.
 */

import axios, {
    AxiosError,
    type AxiosInstance,
    type AxiosRequestConfig,
    type InternalAxiosRequestConfig,
} from 'axios';
import {
    CLIENT_TYPE_MOBILE,
    ENDPOINTS,
    HEADER_CLIENT_TYPE,
    type IRefreshSuccessResponse,
} from '@selfhelp/shared';

import { useAuthStore } from '@/stores/authStore';
import { useServerStore } from '@/stores/serverStore';
import { secureStore } from '@/services/secureStore';
import { SECURE_STORE_KEYS } from '@/constants/secureStore';
import { debugLogger } from '@/services/debugLogger';

interface IRetriableConfig extends InternalAxiosRequestConfig {
    _retry?: boolean;
}

let client: AxiosInstance | null = null;
let refreshInFlight: Promise<string | null> | null = null;

async function attemptRefresh(): Promise<string | null> {
    if (refreshInFlight) return refreshInFlight;

    refreshInFlight = (async () => {
        try {
            const refresh = await secureStore.get(SECURE_STORE_KEYS.REFRESH_TOKEN);
            if (!refresh) return null;
            const baseURL = useServerStore.getState().serverUrl;
            if (!baseURL) return null;

            const resp = await axios.post<IRefreshSuccessResponse>(
                `${baseURL}${ENDPOINTS.AUTH.REFRESH}`,
                { refresh_token: refresh },
                { headers: { [HEADER_CLIENT_TYPE]: CLIENT_TYPE_MOBILE } }
            );
            const next = resp.data.data;
            if (!next?.access_token) return null;

            useAuthStore.getState().setAccessToken(next.access_token);
            if (next.refresh_token) {
                await secureStore.set(SECURE_STORE_KEYS.REFRESH_TOKEN, next.refresh_token);
            }
            return next.access_token;
        } catch {
            useAuthStore.getState().clear();
            await secureStore.remove(SECURE_STORE_KEYS.REFRESH_TOKEN);
            return null;
        } finally {
            refreshInFlight = null;
        }
    })();

    return refreshInFlight;
}

export function getApiClient(): AxiosInstance {
    if (client) return client;

    client = axios.create({
        timeout: 30_000,
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            [HEADER_CLIENT_TYPE]: CLIENT_TYPE_MOBILE,
        },
    });

    client.interceptors.request.use((cfg) => {
        const baseURL = useServerStore.getState().serverUrl;
        if (baseURL && !cfg.baseURL) cfg.baseURL = baseURL;

        const token = useAuthStore.getState().accessToken;
        if (token && cfg.headers) {
            cfg.headers.set('Authorization', `Bearer ${token}`);
        }

        const locale = (globalThis as { __sh_locale?: string }).__sh_locale;
        if (locale && cfg.headers) {
            cfg.headers.set('Accept-Language', locale);
        }
        debugLogger.debug(`→ ${cfg.method?.toUpperCase()} ${cfg.url}`, 'apiClient', {
            params: cfg.params,
            authenticated: Boolean(token),
        });
        return cfg;
    });

    client.interceptors.response.use(
        (resp) => {
            debugLogger.debug(
                `← ${resp.status} ${resp.config.method?.toUpperCase()} ${resp.config.url}`,
                'apiClient'
            );
            return resp;
        },
        async (error: AxiosError) => {
            const cfg = error.config as IRetriableConfig | undefined;
            const status = error.response?.status;
            debugLogger.warn(
                `× ${status ?? 'ERR'} ${cfg?.method?.toUpperCase() ?? '?'} ${cfg?.url ?? '?'}`,
                'apiClient',
                { message: error.message }
            );
            if (!cfg || cfg._retry) throw error;
            if (status !== 401) throw error;

            const next = await attemptRefresh();
            if (!next) throw error;

            cfg._retry = true;
            cfg.headers?.set?.('Authorization', `Bearer ${next}`);
            return client!.request(cfg);
        }
    );

    return client;
}

/** Helper for the rare callsite that needs a one-off request without going through the singleton (e.g. health checks). */
export async function rawRequest<T>(config: AxiosRequestConfig): Promise<T> {
    const baseURL = useServerStore.getState().serverUrl;
    const resp = await axios.request<T>({
        baseURL: baseURL ?? undefined,
        headers: { [HEADER_CLIENT_TYPE]: CLIENT_TYPE_MOBILE },
        ...config,
    });
    return resp.data;
}
