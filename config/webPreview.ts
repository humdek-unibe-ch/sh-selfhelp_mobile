/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Web-preview embed runtime.
 *
 * When the app runs as the `selfhelp-mobile-preview` web image (or a local
 * `expo start --web` dev server embedded by the CMS page editor), the hosting
 * iframe passes the preview intent through the URL query string. The pure
 * parser + types live in `config/webPreviewContract.ts` (unit-tested without
 * expo); this module is the thin runtime accessor that combines them with build
 * config + `window.location`.
 *
 * Security / behaviour rules baked in here:
 *   - `previewSession` is a one-time code, safe in the URL (short-lived,
 *     single-use, invalid after exchange) — it is NOT persisted.
 *   - Every parsed value is SESSION-ONLY: callers must apply it without writing
 *     to secure-store/localStorage (see `stores/devModeStore` session overrides).
 *   - `backendUrl` is honoured ONLY in dev live-reload; production preview
 *     builds ignore it and always use the same-origin `/mobile-preview/api`
 *     proxy. The gate lives in this runtime accessor, not the parser.
 */

import { runtimeConfig } from '@/config/runtime';
import {
    EMPTY_PREVIEW_PARAMS,
    parseWebPreviewParams,
    type IWebPreviewParams,
} from '@/config/webPreviewContract';

export {
    parseWebPreviewParams,
    EMPTY_PREVIEW_PARAMS,
    type IWebPreviewParams,
    type TPreviewDevice,
    type TPreviewOrientation,
    type TPreviewModalMode,
} from '@/config/webPreviewContract';

export interface IWebPreviewRuntime {
    /** True when this build is the web-preview image / preview mode. */
    enabled: boolean;
    /** True when the parsed params indicate an embedded (iframe) session. */
    isEmbedded: boolean;
    /** Parsed embed contract (defaults when not running on web). */
    params: IWebPreviewParams;
    /**
     * API base the preview app should call. Same-origin `/mobile-preview/api`
     * by default (proxied to the private backend); a dev-only `backendUrl`
     * override is honoured only on a dev instance.
     */
    apiBase: string | null;
    /**
     * Web frontend origin used by `OpenOnWebFallback` deep-links. The preview
     * image is served on the SAME host as the web frontend (Traefik routes
     * `/mobile-preview` to the preview, catch-all to the frontend), so the
     * current origin IS the frontend origin unless explicitly overridden.
     */
    webFrontendOrigin: string | null;
}

function currentSearch(): string {
    if (typeof window === 'undefined' || !window.location) return '';
    return window.location.search ?? '';
}

function currentOrigin(): string | null {
    if (typeof window === 'undefined' || !window.location) return null;
    return window.location.origin ?? null;
}

/**
 * Resolve the runtime web-preview state from build config + the current URL.
 * Cheap; safe to call from providers / dev components at render time.
 */
export function getWebPreviewRuntime(): IWebPreviewRuntime {
    const params = parseWebPreviewParams(currentSearch());

    // Preview mode engages when the build is the dedicated preview image
    // (APP_WEB_PREVIEW=1) OR — crucially for local `expo start --web` live-reload
    // — when the hosting iframe passes an embedded one-time session in the URL.
    // The latter lets a PLAIN dev server act as the CMS Live Preview without the
    // special build flag; the CMS supplies a dev `backendUrl` so the same-origin
    // `/mobile-preview/api` proxy (which only exists on the installed image) is
    // not required.
    const enabledByBuild = runtimeConfig.webPreviewEnabled === true;
    const enabledByUrl =
        params.embed && typeof params.previewSession === 'string' && params.previewSession !== '';
    if (!enabledByBuild && !enabledByUrl) {
        return {
            enabled: false,
            isEmbedded: false,
            params: EMPTY_PREVIEW_PARAMS,
            apiBase: null,
            webFrontendOrigin: runtimeConfig.webFrontendOrigin,
        };
    }

    // Dev-only backend override (live-reload). Never honoured on a production
    // preview build, where the same-origin proxy is the only allowed path.
    const devBackendOverride = runtimeConfig.isDevInstance ? params.backendUrl : null;
    const sameOriginBase = `${runtimeConfig.webPreviewBaseUrl.replace(/\/+$/, '')}/api`;
    const apiBase = devBackendOverride ?? sameOriginBase;

    const webFrontendOrigin = runtimeConfig.webFrontendOrigin ?? currentOrigin();

    return {
        enabled: true,
        isEmbedded: params.embed,
        params,
        apiBase,
        webFrontendOrigin,
    };
}
