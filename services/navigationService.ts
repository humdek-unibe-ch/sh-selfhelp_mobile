/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import { ENDPOINTS, type INavigationPayload } from '@selfhelp/shared';

import { getApiClient } from '@/services/apiClient';

interface INavigationEnvelope {
    data: INavigationPayload;
}

export async function fetchNavigation(languageId?: number): Promise<INavigationPayload> {
    const client = getApiClient();
    const params: Record<string, string> = {};
    if (languageId) {
        params.language_id = String(languageId);
    }
    const resp = await client.get<INavigationEnvelope>(ENDPOINTS.NAVIGATION.GET, {
        params: Object.keys(params).length ? params : undefined,
    });
    if (!resp.data.data) {
        throw new Error('Navigation payload missing');
    }
    return resp.data.data;
}

export async function recordLastVisited(payload: {
    page_id: number;
    keyword: string;
    url?: string;
    platform?: 'web' | 'mobile';
}): Promise<void> {
    const client = getApiClient();
    await client.put(ENDPOINTS.NAVIGATION.LAST_VISITED, payload, {
        headers: { 'X-Client-Type': payload.platform ?? 'mobile' },
    });
}
