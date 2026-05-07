/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Axios instance shared across the app.
 *
 * - `baseURL` is read from `useServerStore.serverUrl` on every request,
 *   so a server switch immediately routes to the new host without
 *   recreating the client.
 * - `X-Client-Type: mobile` is attached on every request so the backend
 *   filters pages and evaluates conditions for the mobile platform.
 * - Access token (in-memory) is attached when present.
 * - On 401 the request is retried once after a single refresh through
 *   `tokenRefreshService.refreshAccessToken()`. Parallel 401s share the
 *   same in-flight refresh promise, so the rotated refresh token is
 *   only spent once even when several queries fail concurrently.
 */

import axios, {
    AxiosError,
    type AxiosInstance,
    type AxiosRequestConfig,
    type InternalAxiosRequestConfig,
} from 'axios';
import { CLIENT_TYPE_MOBILE, HEADER_CLIENT_TYPE } from '@selfhelp/shared';

import { useAuthStore } from '@/stores/authStore';
import { useServerStore } from '@/stores/serverStore';
import { debugLogger } from '@/services/debugLogger';
import { refreshAccessToken } from '@/services/tokenRefreshService';

interface IRetriableConfig extends InternalAxiosRequestConfig {
    _retry?: boolean;
    _skipAuthRefresh?: boolean;
    _shStartedAt?: number;
}

let client: AxiosInstance | null = null;

function logFullUrl(cfg: { baseURL?: string; url?: string; params?: unknown }): string {
    const base = cfg.baseURL ?? '';
    const path = cfg.url ?? '';
    const search =
        cfg.params && typeof cfg.params === 'object'
            ? `?${new URLSearchParams(cfg.params as Record<string, string>).toString()}`
            : '';
    return `${base}${path}${search}`;
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

        (cfg as IRetriableConfig)._shStartedAt = Date.now();
        debugLogger.info(
            `→ ${cfg.method?.toUpperCase() ?? 'GET'} ${logFullUrl(cfg)}`,
            'api',
            { authenticated: Boolean(token), retry: Boolean((cfg as IRetriableConfig)._retry) }
        );
        return cfg;
    });

    client.interceptors.response.use(
        (resp) => {
            const cfg = resp.config as IRetriableConfig;
            const ms = cfg._shStartedAt ? Date.now() - cfg._shStartedAt : null;
            debugLogger.info(
                `← ${resp.status} ${cfg.method?.toUpperCase() ?? 'GET'} ${logFullUrl(cfg)}${
                    ms !== null ? ` (${ms}ms)` : ''
                }`,
                'api'
            );
            return resp;
        },
        async (error: AxiosError) => {
            const cfg = error.config as IRetriableConfig | undefined;
            const status = error.response?.status;
            const ms = cfg?._shStartedAt ? Date.now() - cfg._shStartedAt : null;
            debugLogger.warn(
                `× ${status ?? 'ERR'} ${cfg?.method?.toUpperCase() ?? '?'} ${
                    cfg ? logFullUrl(cfg) : '?'
                }${ms !== null ? ` (${ms}ms)` : ''}`,
                'api',
                { message: error.message, retry: Boolean(cfg?._retry) }
            );
            if (!cfg || cfg._retry || cfg._skipAuthRefresh) throw error;
            if (status !== 401) throw error;

            debugLogger.info(
                `↻ 401 → refresh attempt for ${cfg.method?.toUpperCase()} ${cfg.url}`,
                'api'
            );
            const next = await refreshAccessToken();
            if (!next) {
                debugLogger.warn(
                    `↻ refresh failed — propagating 401 for ${cfg.method?.toUpperCase()} ${cfg.url}`,
                    'api'
                );
                throw error;
            }

            cfg._retry = true;
            cfg.headers?.set?.('Authorization', `Bearer ${next}`);
            debugLogger.info(
                `↻ replaying request with new access token: ${cfg.method?.toUpperCase()} ${cfg.url}`,
                'api'
            );
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
