/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import { useEffect, useMemo, useState } from 'react';

import { assetSource, type IAssetSource } from '@/components/renderer/assetSource';
import { getWebPreviewRuntime } from '@/config/webPreview';
import { isAccessTokenExpiring } from '@/services/accessTokenExpiry';
import { refreshAccessToken } from '@/services/tokenRefreshService';
import { useAuthStore } from '@/stores/authStore';
import { useServerStore } from '@/stores/serverStore';

/**
 * {@link assetSource} for the current server and session.
 *
 * Image, video and audio players cannot hand a 401 back for a retry the way
 * `getApiClient()` does, so a token that has expired (or is about to) is
 * renewed BEFORE the request: the source is withheld until
 * `refreshAccessToken()` has stored a fresh token. When the renewal does not
 * help (offline, or a token that still looks old) the source is returned as it
 * is, so the request goes out and fails like any other. The web preview holds
 * a short-lived token without a refresh token, so it is left alone.
 */
export function useAssetSource(src: string | null | undefined): IAssetSource | null {
    const baseUrl = useServerStore((s) => s.serverUrl) ?? '';
    const accessToken = useAuthStore((s) => s.accessToken);

    const source = useMemo(() => assetSource(src, baseUrl, accessToken), [src, baseUrl, accessToken]);

    // Only a request that carries the token can fail because of it.
    const expiring =
        source?.headers !== undefined && isAccessTokenExpiring(accessToken) && !getWebPreviewRuntime().enabled;
    // The token the last renewal attempt ended on, so one stale token is renewed once and never in a loop.
    const [settledToken, setSettledToken] = useState<string | null>(null);
    const waiting = expiring && settledToken !== accessToken;

    useEffect(() => {
        if (!waiting) return undefined;

        let active = true;
        void refreshAccessToken()
            .catch(() => null)
            .then((next) => {
                if (active) setSettledToken(next ?? accessToken);
            });

        return () => {
            active = false;
        };
    }, [waiting, accessToken]);

    return waiting ? null : source;
}
