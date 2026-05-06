/**
 * Thin service wrapping `/cms-api/v1/pages/by-keyword/{keyword}` and
 * the page list endpoint. The mobile app consumes pages by keyword
 * (not by id) for human-friendly deep links.
 *
 * `preview=true` is passed through so dev/preview builds can flip
 * between published and draft content via the debug panel.
 */

import { ENDPOINTS, type IGetPageResponse, type IGetPagesResponse, type IPageContent, type IPageItem } from '@selfhelp/shared';

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

export async function fetchPages(languageId?: number): Promise<IPageItem[]> {
    const client = getApiClient();
    const url = languageId ? ENDPOINTS.PAGES.LIST_WITH_LANGUAGE(languageId) : ENDPOINTS.PAGES.LIST;
    const resp = await client.get<IGetPagesResponse>(url);
    return resp.data.data ?? [];
}
