/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import { useQuery } from '@tanstack/react-query';
import type { INavigationPayload } from '@selfhelp/shared';

import { fetchNavigation } from '@/services/navigationService';
import { useAuthStore } from '@/stores/authStore';
import { useLanguageStore } from '@/stores/languageStore';
import { useServerStore } from '@/stores/serverStore';

export const navigationQueryKey = (
    serverUrl: string | null,
    languageId: number | null,
    authScope: 'auth' | 'anon',
): readonly unknown[] => ['navigation', serverUrl ?? 'no-server', languageId, authScope] as const;

export function useNavigation(): {
    data: INavigationPayload | undefined;
    isLoading: boolean;
    error: Error | null;
} {
    const languageId = useLanguageStore((s) => s.languageId);
    const serverUrl = useServerStore((s) => s.serverUrl);
    const serverHydrated = useServerStore((s) => s.hydrated);
    const bootstrapped = useAuthStore((s) => s.bootstrapped);
    const accessToken = useAuthStore((s) => s.accessToken);
    const authScope = accessToken ? 'auth' : 'anon';

    const query = useQuery<INavigationPayload, Error>({
        queryKey: navigationQueryKey(serverUrl, languageId, authScope),
        queryFn: () => fetchNavigation(languageId ?? undefined),
        enabled: Boolean(serverUrl) && serverHydrated && bootstrapped,
        staleTime: 60 * 1000,
    });

    return {
        data: query.data,
        isLoading: query.isLoading,
        error: query.error ?? null,
    };
}
