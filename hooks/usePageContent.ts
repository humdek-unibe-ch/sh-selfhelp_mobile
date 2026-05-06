/**
 * Fetch a page by keyword via TanStack Query. Cached per
 * (keyword, languageId, preview) so language switches and preview-mode
 * toggles refetch cleanly without poisoning the published-cache entry.
 */

import { useQuery } from '@tanstack/react-query';
import type { IPageContent } from '@selfhelp/shared';

import { fetchPageByKeyword } from '@/services/pageService';
import { useDevModeStore } from '@/stores/devModeStore';
import { useLanguageStore } from '@/stores/languageStore';
import { useServerStore } from '@/stores/serverStore';

export const pageContentQueryKey = (
    keyword: string,
    languageId: number | null,
    preview: boolean
): readonly unknown[] => ['page', keyword, languageId, preview ? 'preview' : 'published'] as const;

export function usePageContent(keyword: string): {
    data: IPageContent | undefined;
    isLoading: boolean;
    error: Error | null;
    refetch: () => Promise<unknown>;
} {
    const languageId = useLanguageStore((s) => s.languageId);
    const serverUrl = useServerStore((s) => s.serverUrl);
    const previewMode = useDevModeStore((s) => s.previewMode);

    const q = useQuery<IPageContent, Error>({
        queryKey: pageContentQueryKey(keyword, languageId, previewMode),
        queryFn: () =>
            fetchPageByKeyword(keyword, {
                languageId: languageId ?? undefined,
                preview: previewMode,
            }),
        enabled: Boolean(keyword) && Boolean(serverUrl),
        // Preview content is short-lived: never cache it across mode flips.
        staleTime: previewMode ? 0 : 30 * 1000,
        gcTime: previewMode ? 0 : 5 * 60 * 1000,
    });

    return { data: q.data, isLoading: q.isLoading, error: q.error ?? null, refetch: q.refetch };
}
