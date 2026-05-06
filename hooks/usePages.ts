import { useQuery } from '@tanstack/react-query';
import type { IPageItem } from '@selfhelp/shared';

import { fetchPages } from '@/services/pageService';
import { useLanguageStore } from '@/stores/languageStore';
import { useServerStore } from '@/stores/serverStore';

export const pagesQueryKey = (languageId: number | null): readonly unknown[] =>
    ['pages', languageId] as const;

export function usePages(): {
    data: IPageItem[] | undefined;
    isLoading: boolean;
    error: Error | null;
} {
    const languageId = useLanguageStore((s) => s.languageId);
    const serverUrl = useServerStore((s) => s.serverUrl);

    const query = useQuery<IPageItem[], Error>({
        queryKey: pagesQueryKey(languageId),
        queryFn: () => fetchPages(languageId ?? undefined),
        enabled: Boolean(serverUrl),
        staleTime: 60 * 1000,
    });

    return {
        data: query.data,
        isLoading: query.isLoading,
        error: query.error ?? null,
    };
}
