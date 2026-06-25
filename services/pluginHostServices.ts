/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Mobile host-services bridge implementation.
 *
 * Plugin mobile packages (e.g. the SurveyJS WebView renderer) never own
 * authenticated network access. They call `getMobileHostServices()` from
 * `@selfhelp/shared/plugin-sdk` and route every protected request through the
 * `IMobileHostServices` the host registers here at boot.
 *
 * The implementation reuses the app's `getApiClient()` singleton, so a plugin
 * request gets the SAME `baseURL` (server store), `Authorization` bearer token
 * (auth store), `Accept-Language`, `X-Client-Type: mobile`, and the single
 * 401 -> `refreshAccessToken()` -> retry round-trip as every other app call.
 * When the refresh itself fails the interceptor re-throws the 401 and we report
 * `sessionExpired` so the plugin can surface a "session expired" state instead
 * of a generic error.
 *
 * Security: absolute URLs are rejected so a plugin cannot redirect a protected,
 * token-bearing call off-origin.
 */

import { type AxiosError } from 'axios';
import { Linking } from 'react-native';
import {
    setMobileHostServices,
    type IMobileHostRequest,
    type IMobileHostResponse,
    type IMobileHostServices,
} from '@selfhelp/shared/plugin-sdk';

import { navigateToPage } from '@/components/shell/usePageNavigation';
import { getApiClient } from '@/services/apiClient';
import { debugLogger } from '@/services/debugLogger';
import { useAuthStore } from '@/stores/authStore';
import { useServerStore } from '@/stores/serverStore';

/**
 * Host-owned navigation for a plugin's in-content redirect (e.g. a survey's
 * "redirect on completion"). The host owns the router, so an internal CMS target
 * routes through the app-wide page navigation (`navigateToPage`) — applying the
 * GLOBAL modal rule (off-menu pages open as a modal over the current page) and
 * working in the native app AND in the web-export live preview, where the plugin
 * doing its own `location.assign` would navigate (and break) the embedded iframe
 * instead of the app. An explicit external URL leaves the app (system browser /
 * new tab).
 *
 * Mirrors the app's own link handling (`Link` -> `Linking.openURL` for external)
 * and post-submit redirect (`FormUserInput` -> `navigateToPage`).
 */
function performHostNavigate(target: string, external = false): void {
    const isAbsolute = /^[a-z][a-z0-9+.-]*:\/\//i.test(target);
    if (external || isAbsolute) {
        void Linking.openURL(target);
        return;
    }
    navigateToPage(target);
}

function extractReason(body: unknown): string | undefined {
    if (body && typeof body === 'object' && 'reason' in body) {
        const reason = (body as { reason?: unknown }).reason;
        if (typeof reason === 'string') return reason;
    }
    return undefined;
}

function extractError(body: unknown, fallback: string): string {
    if (body && typeof body === 'object') {
        const record = body as { error?: unknown; message?: unknown };
        if (typeof record.error === 'string' && record.error !== '') return record.error;
        if (typeof record.message === 'string' && record.message !== '') return record.message;
    }
    return fallback;
}

async function performHostRequest<TData>(req: IMobileHostRequest): Promise<IMobileHostResponse<TData>> {
    if (/^[a-z][a-z0-9+.-]*:\/\//i.test(req.path)) {
        return { ok: false, status: 0, data: null, error: 'Absolute URLs are not allowed for host requests.' };
    }
    try {
        const resp = await getApiClient().request<TData>({
            url: req.path,
            method: req.method ?? 'GET',
            data: req.body,
            params: req.query,
            headers: req.headers,
        });
        return { ok: true, status: resp.status, data: (resp.data ?? null) as TData | null };
    } catch (err) {
        const axiosError = err as AxiosError;
        const status = axiosError.response?.status ?? 0;
        const body = axiosError.response?.data ?? null;
        const sessionExpired = status === 401;
        debugLogger.warn(
            `plugin host request failed: ${req.method ?? 'GET'} ${req.path} -> ${status}`,
            'pluginHostServices',
            { sessionExpired },
        );
        return {
            ok: false,
            status,
            data: body as TData | null,
            reason: extractReason(body),
            error: extractError(body, axiosError.message),
            sessionExpired,
        };
    }
}

export function createMobileHostServices(): IMobileHostServices {
    return {
        apiBaseUrl: () => useServerStore.getState().serverUrl ?? '',
        getAccessToken: () => useAuthStore.getState().accessToken ?? null,
        request: performHostRequest,
        navigate: performHostNavigate,
    };
}

let registered = false;

/**
 * Register the host services singleton once at boot. Idempotent — safe to call
 * from a provider effect that may re-run. The implementation reads the server /
 * auth stores lazily on each request, so a later server switch or token refresh
 * is picked up without re-registering.
 */
export function registerMobileHostServices(): void {
    if (registered) return;
    setMobileHostServices(createMobileHostServices());
    registered = true;
    debugLogger.info('mobile host services registered', 'pluginHostServices');
}
