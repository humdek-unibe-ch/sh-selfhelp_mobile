/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Thin service wrapping `/cms-api/v1/pages/by-keyword/{keyword}`,
 * `/cms-api/v1/pages/resolve` and the page list endpoint. The mobile app
 * consumes pages by keyword (not by id) for human-friendly deep links, and by
 * full URL path for parameterized deep links via the DB-driven `page_routes`
 * resolver (issue #30).
 *
 * `preview=true` is passed through so dev/preview builds can flip
 * between published and draft content via the debug panel.
 */

import {
    ENDPOINTS,
    transformPagesData,
    type IGetPageResponse,
    type IGetPagesResponse,
    type IPageContent,
    type IPageItem,
    type IResolvePageResponse,
} from '@selfhelp/shared';

import { getApiClient } from '@/services/apiClient';

interface IFetchPageOptions {
    languageId?: number;
    preview?: boolean;
}

export async function fetchPageByKeyword(keyword: string, options: IFetchPageOptions = {}): Promise<IPageContent> {
    const client = getApiClient();
    const params: Record<string, string> = {};
    if (options.languageId) params.language_id = String(options.languageId);
    if (options.preview) params.preview = 'true';

    const resp = await client.get<IGetPageResponse>(ENDPOINTS.PAGES.BY_KEYWORD(keyword), {
        params: Object.keys(params).length ? params : undefined,
    });
    if (!resp.data.data?.page) throw new Error(resp.data.error ?? 'Page not found');
    return resp.data.data.page;
}

/**
 * Resolve a full public URL path to its page content via the DB-driven
 * `page_routes` contract (issue #30). This is how parameterized deep links
 * (`/reset/{user_id}/{token}`, `/validate/{user_id}/{token}`, `/team/{record_id}`)
 * map to a page on mobile without hardcoding slug parsing: the resolved page
 * carries snake_case `route_params` (matching the Expo Router deep-link param
 * names) plus `matched_url_pattern` / `canonical_url`.
 *
 * The `path` is sent URL-encoded inside the endpoint URL; `language_id` /
 * `preview` ride along as query params, mirroring `fetchPageByKeyword`.
 */
export async function resolvePageByPath(path: string, options: IFetchPageOptions = {}): Promise<IPageContent> {
    const client = getApiClient();
    const params: Record<string, string> = {};
    if (options.languageId) params.language_id = String(options.languageId);
    if (options.preview) params.preview = 'true';

    const resp = await client.get<IResolvePageResponse>(ENDPOINTS.PAGES.RESOLVE(path), {
        params: Object.keys(params).length ? params : undefined,
    });
    if (!resp.data.data?.page) throw new Error(resp.data.error ?? 'Page not found');
    return resp.data.data.page;
}

export async function fetchPages(languageId?: number): Promise<IPageItem[]> {
    const client = getApiClient();
    const url = languageId ? ENDPOINTS.PAGES.LIST_WITH_LANGUAGE(languageId) : ENDPOINTS.PAGES.LIST;
    const resp = await client.get<IGetPagesResponse>(url);
    return transformPagesData((resp.data.data ?? []) as unknown as Parameters<typeof transformPagesData>[0]);
}
