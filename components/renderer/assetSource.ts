/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Media source for a CMS asset reference.
 *
 * Uploaded assets are served by the backend's access-checked route
 * `/cms-api/v1/assets/{uuid}`: an asset restricted to groups is only returned
 * to a member, so the request must carry the user's bearer token. Image, video
 * and audio requests do not go through `getApiClient()`, so the header is added
 * here — and only for that route on the configured backend, never for external
 * URLs.
 */
import { resolveAssetUrl } from '@selfhelp/shared';

const ASSET_ROUTE = '/cms-api/v1/assets/';
/** Section-scoped current / historical list files (F165) also need the session. */
const LIST_FILES_ROUTE = '/cms-api/v1/lists/';

export interface IAssetSource {
    uri: string;
    headers?: Record<string, string>;
}

function needsBearer(uri: string, base: string): boolean {
    if (base === '' || !uri.startsWith(base)) {
        return false;
    }
    if (uri.startsWith(`${base}${ASSET_ROUTE}`)) {
        return true;
    }
    // `/cms-api/v1/lists/{section}/records/{id}/files/...` and `.../versions/{v}/files/...`
    return uri.startsWith(`${base}${LIST_FILES_ROUTE}`) && uri.includes('/files/');
}

export function assetSource(
    src: string | null | undefined,
    baseUrl: string,
    accessToken: string | null | undefined,
): IAssetSource | null {
    if (!src) return null;

    const uri = resolveAssetUrl(src, baseUrl);
    const base = baseUrl.replace(/\/+$/, '');
    if (accessToken && needsBearer(uri, base)) {
        return { uri, headers: { Authorization: `Bearer ${accessToken}` } };
    }

    return { uri };
}
