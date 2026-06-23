/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Pure web-preview embed contract: types + parser, with NO runtime/expo
 * imports, so it can be unit-tested directly under `node --test`. The
 * runtime accessor that reads build config + `window.location` lives in
 * `config/webPreview.ts` (which re-exports everything here).
 *
 * The hosting CMS iframe passes the preview intent through the URL query string:
 *
 *   /mobile-preview/?embed=1&keyword=<kw>&device=phone|tablet
 *     &orientation=portrait|landscape&frame=0|1&preview=true
 *     &previewSession=<one-time-code>&hideDebugPanel=true&banner=0
 *     &language=<locale>&backendUrl=<dev-only>
 */

export type TPreviewDevice = 'phone' | 'tablet';
export type TPreviewOrientation = 'portrait' | 'landscape';

export interface IWebPreviewParams {
    /** `embed=1` — running inside the CMS iframe (hide dev chrome, slim badge). */
    embed: boolean;
    /** CMS page keyword to route to on boot, if provided. */
    keyword: string | null;
    device: TPreviewDevice;
    orientation: TPreviewOrientation;
    /** `frame=0` disables the device frame even when embedded. */
    frame: boolean;
    /** `preview=true` fetches draft/unpublished CMS content. */
    preview: boolean;
    /** One-time preview-session code to exchange for a scoped JWT. */
    previewSession: string | null;
    /** `hideDebugPanel=true` suppresses the floating debug FAB. */
    hideDebugPanel: boolean;
    /** `banner=0` hides the slim "preview" badge. */
    banner: boolean;
    /** Locale override for the preview render. */
    language: string | null;
    /** Dev-only backend origin override (ignored in production preview). */
    backendUrl: string | null;
}

/** Defaults applied when a param is absent or when not running on web. */
export const EMPTY_PREVIEW_PARAMS: IWebPreviewParams = {
    embed: false,
    keyword: null,
    device: 'phone',
    orientation: 'portrait',
    frame: true,
    preview: false,
    previewSession: null,
    hideDebugPanel: false,
    banner: true,
    language: null,
    backendUrl: null,
};

const TRUE_TOKENS = new Set(['1', 'true', 'yes', 'on']);
const FALSE_TOKENS = new Set(['0', 'false', 'no', 'off']);

function parseBool(value: string | null, fallback: boolean): boolean {
    if (value === null) return fallback;
    const v = value.trim().toLowerCase();
    if (TRUE_TOKENS.has(v)) return true;
    if (FALSE_TOKENS.has(v)) return false;
    return fallback;
}

function parseDevice(value: string | null): TPreviewDevice {
    return value === 'tablet' ? 'tablet' : 'phone';
}

function parseOrientation(value: string | null): TPreviewOrientation {
    return value === 'landscape' ? 'landscape' : 'portrait';
}

function nonEmptyOrNull(value: string | null): string | null {
    if (value === null) return null;
    const trimmed = value.trim();
    return trimmed === '' ? null : trimmed;
}

/**
 * Pure parser for the embed contract. Accepts a raw query string
 * (`"/?a=1&b=2"`, `"?a=1"`, or `"a=1&b=2"`) or a `URLSearchParams`.
 *
 * Defaults match the contract: not embedded, phone/portrait, frame on, preview
 * off, banner on, debug panel shown.
 */
export function parseWebPreviewParams(search: string | URLSearchParams): IWebPreviewParams {
    const sp = typeof search === 'string' ? new URLSearchParams(search) : search;

    return {
        embed: parseBool(sp.get('embed'), false),
        keyword: nonEmptyOrNull(sp.get('keyword')),
        device: parseDevice(sp.get('device')),
        orientation: parseOrientation(sp.get('orientation')),
        frame: parseBool(sp.get('frame'), true),
        preview: parseBool(sp.get('preview'), false),
        previewSession: nonEmptyOrNull(sp.get('previewSession')),
        hideDebugPanel: parseBool(sp.get('hideDebugPanel'), false),
        banner: parseBool(sp.get('banner'), true),
        language: nonEmptyOrNull(sp.get('language')),
        backendUrl: nonEmptyOrNull(sp.get('backendUrl')),
    };
}
