/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import { useMemo } from 'react';

import { assetSource, type IAssetSource } from '@/components/renderer/assetSource';
import { useAuthStore } from '@/stores/authStore';
import { useServerStore } from '@/stores/serverStore';

/** {@link assetSource} for the current server and session. */
export function useAssetSource(src: string | null | undefined): IAssetSource | null {
    const baseUrl = useServerStore((s) => s.serverUrl) ?? '';
    const accessToken = useAuthStore((s) => s.accessToken);

    return useMemo(() => assetSource(src, baseUrl, accessToken), [src, baseUrl, accessToken]);
}
