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
 *
 * Renderer 0.4.0 adds four optional services a plugin feature-detects:
 * `upload` (a multipart request with the same token, headers and refresh as
 * `request`), `requestPermission` and `openAppSettings` (only the app asks the
 * system for microphone and camera access; a plugin in a WebView cannot) and
 * `getPluginStorage` (a small device store per server, user and plugin, emptied
 * with the other caches on logout). The rules behind them are pure and tested
 * in `pluginHostBridge.ts` and `pluginStorage.ts`; this file wires the HTTP
 * client, the file system and the permission libraries into them.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Directory, File, Paths } from 'expo-file-system';
import { Linking, Platform } from 'react-native';
import {
    setMobileHostServices,
    type IMobileHostRequest,
    type IMobileHostResponse,
    type IMobileHostServices,
    type IMobileHostUploadRequest,
    type TMobileHostPermission,
    type TMobileHostPermissionState,
} from '@selfhelp/shared/plugin-sdk';

import { navigateToPage } from '@/components/shell/usePageNavigation';
import { ensureCameraPermission, ensureMicrophonePermission } from '@/native/permissions';
import { getApiClient } from '@/services/apiClient';
import { debugLogger } from '@/services/debugLogger';
import { toFormData, type TMultipartPart } from '@/services/formRequests';
import {
    ABSOLUTE_URL_ERROR,
    hostFailure,
    isAbsoluteUrl,
    performHostUpload,
    requestHostPermission,
    type IUploadCall,
    type IUploadDeps,
    type IUploadTempFile,
} from '@/services/pluginHostBridge';
import { createPluginStorage, type IPluginStorageContext } from '@/services/pluginStorage';
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

async function performHostRequest<TData>(req: IMobileHostRequest): Promise<IMobileHostResponse<TData>> {
    if (isAbsoluteUrl(req.path)) {
        return { ok: false, status: 0, data: null, error: ABSOLUTE_URL_ERROR };
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
        const failure = hostFailure<TData>(err);
        debugLogger.warn(
            `plugin host request failed: ${req.method ?? 'GET'} ${req.path} -> ${failure.status}`,
            'pluginHostServices',
            { sessionExpired: failure.sessionExpired },
        );
        return failure;
    }
}

/** Where `base64` upload inputs are written for the request; each file is removed right after it. */
const UPLOAD_TEMP_FOLDER = 'selfhelp-plugin-upload';
let uploadTempCounter = 0;

/**
 * Native: the base64 goes to a temporary file in the app cache. Web preview: a
 * `data:` URI, read into a Blob when the body is built.
 */
async function materializeBase64(file: { base64: string; name: string; type: string }): Promise<IUploadTempFile> {
    if (Platform.OS === 'web') {
        return { uri: `data:${file.type};base64,${file.base64}`, cleanup: () => undefined };
    }
    const directory = new Directory(Paths.cache, UPLOAD_TEMP_FOLDER);
    directory.create({ idempotent: true, intermediates: true });
    uploadTempCounter += 1;
    // The name is the host's own: nothing a plugin sent becomes part of the path.
    const temp = new File(directory, `upload-${Date.now()}-${uploadTempCounter}.bin`);
    temp.create({ overwrite: true });
    temp.write(file.base64, { encoding: 'base64' });
    return {
        uri: temp.uri,
        cleanup: () => {
            if (temp.exists) temp.delete();
        },
    };
}

async function sizeOfUri(uri: string): Promise<number | null> {
    if (Platform.OS === 'web') return null;
    try {
        const file = new File(uri);
        return file.exists ? file.size : null;
    } catch {
        return null;
    }
}

/** Web preview: a file part is a Blob read from its `blob:` / `data:` URI. */
async function toWebFormData(parts: readonly TMultipartPart[]): Promise<FormData> {
    const form = new FormData();
    for (const part of parts) {
        if ('file' in part) {
            const blob = await (await fetch(part.file.uri)).blob();
            form.append(part.name, new Blob([blob], { type: part.file.type }), part.file.name);
        } else {
            form.append(part.name, part.value);
        }
    }
    return form;
}

async function sendMultipart(call: IUploadCall): Promise<{ status: number; data: unknown }> {
    const isWeb = Platform.OS === 'web';
    const data = isWeb ? await toWebFormData(call.parts) : toFormData(call.parts);
    // The browser adds the boundary itself; the native stack needs the type (as the form writes do).
    const headers = isWeb ? { ...call.headers } : { ...call.headers, 'Content-Type': 'multipart/form-data' };
    const resp = await getApiClient().request({
        url: call.path,
        method: call.method,
        data,
        params: call.query,
        headers,
    });
    return { status: resp.status, data: resp.data };
}

const uploadDeps: IUploadDeps = {
    materializeBase64,
    sizeOfUri,
    send: sendMultipart,
    onFailure: (response, call) =>
        debugLogger.warn(
            `plugin host upload failed: ${call.method} ${call.path} -> ${response.status}`,
            'pluginHostServices',
            { sessionExpired: response.sessionExpired },
        ),
};

function performUpload<TData>(req: IMobileHostUploadRequest): Promise<IMobileHostResponse<TData>> {
    return performHostUpload<TData>(req, uploadDeps);
}

/**
 * Both kinds ask through the app's own permission helpers (`native/permissions.ts`),
 * and only when the permission is not yet given.
 */
function requestPermission(kind: TMobileHostPermission): Promise<TMobileHostPermissionState> {
    return requestHostPermission(kind, {
        microphone: () => ensureMicrophonePermission(),
        camera: () => ensureCameraPermission(),
    });
}

function openAppSettings(): void {
    if (Platform.OS === 'web') return;
    Linking.openSettings().catch(() => undefined);
}

function pluginStorageContext(): IPluginStorageContext {
    return {
        serverUrl: useServerStore.getState().serverUrl,
        userId: useAuthStore.getState().user?.id ?? null,
    };
}

export function createMobileHostServices(): IMobileHostServices {
    return {
        apiBaseUrl: () => useServerStore.getState().serverUrl ?? '',
        getAccessToken: () => useAuthStore.getState().accessToken ?? null,
        request: performHostRequest,
        navigate: performHostNavigate,
        upload: performUpload,
        requestPermission,
        openAppSettings,
        getPluginStorage: (pluginId) => createPluginStorage(AsyncStorage, pluginStorageContext, pluginId),
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
