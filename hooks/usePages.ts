import { useQuery } from '@tanstack/react-query';
import type { IPageItem } from '@selfhelp/shared';

import { fetchPages } from '@/services/pageService';
import { useAuthStore } from '@/stores/authStore';
import { useLanguageStore } from '@/stores/languageStore';
import { useServerStore } from '@/stores/serverStore';

export const pagesQueryKey = (
    serverUrl: string | null,
    languageId: number | null,
    authScope: 'auth' | 'anon'
): readonly unknown[] => ['pages', serverUrl ?? 'no-server', languageId, authScope] as const;

export function usePages(): {
    data: IPageItem[] | undefined;
    isLoading: boolean;
    error: Error | null;
} {
    const languageId = useLanguageStore((s) => s.languageId);
    const serverUrl = useServerStore((s) => s.serverUrl);
    const serverHydrated = useServerStore((s) => s.hydrated);
    const bootstrapped = useAuthStore((s) => s.bootstrapped);
    const accessToken = useAuthStore((s) => s.accessToken);
    const authScope = accessToken ? 'auth' : 'anon';

    const query = useQuery<IPageItem[], Error>({
        queryKey: pagesQueryKey(serverUrl, languageId, authScope),
        queryFn: () => fetchPages(languageId ?? undefined),
        enabled: Boolean(serverUrl) && serverHydrated && bootstrapped,
        staleTime: 60 * 1000,
    });

    return {
        data: query.data,
        isLoading: query.isLoading,
        error: query.error ?? null,
    };
}
