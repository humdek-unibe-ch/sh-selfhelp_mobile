/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Mobile preview-session exchange.
 *
 * The web-preview image boots with a ONE-TIME code in its iframe URL
 * (`previewSession=<code>`). This service POSTs that code to the public
 * exchange endpoint (proxied to the private backend through
 * `/mobile-preview/api`) and receives a short-lived scoped JWT
 * (`purpose: 'mobile_preview'`) plus the previewed user. The token is held in
 * memory by `useAuthStore`; it is never persisted.
 *
 * Raw axios is used deliberately (like login/refresh) so the apiClient
 * interceptors — which assume a normal session + refresh token — do not run on
 * this one-shot bootstrap call.
 */

import axios from 'axios';
import {
    CLIENT_TYPE_MOBILE,
    HEADER_CLIENT_TYPE,
    MOBILE_PREVIEW_ENDPOINTS,
    type IMobilePreviewExchangeResponse,
    type IUserData,
} from '@selfhelp/shared';

export interface IPreviewSessionResult {
    accessToken: string;
    expiresIn: number;
    user: IUserData;
}

/**
 * Exchange a one-time preview code for a scoped session. Returns `null` when
 * the response is malformed or the code is rejected.
 */
export async function exchangePreviewSession(
    apiBase: string,
    code: string,
): Promise<IPreviewSessionResult | null> {
    const url = `${apiBase.replace(/\/+$/, '')}${MOBILE_PREVIEW_ENDPOINTS.EXCHANGE}`;
    const response = await axios.post<Partial<IMobilePreviewExchangeResponse>>(
        url,
        { code },
        {
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                [HEADER_CLIENT_TYPE]: CLIENT_TYPE_MOBILE,
            },
            timeout: 10_000,
        },
    );

    const data = response.data?.data;
    if (!data || typeof data.access_token !== 'string' || data.access_token === '') {
        return null;
    }

    return {
        accessToken: data.access_token,
        expiresIn: typeof data.expires_in === 'number' ? data.expires_in : 0,
        user: (data.user ?? null) as IUserData,
    };
}
