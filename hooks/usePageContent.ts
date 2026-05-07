/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Fetch a page by keyword via TanStack Query. Cached per
 * (keyword, languageId, preview) so language switches and preview-mode
 * toggles refetch cleanly without poisoning the published-cache entry.
 */

import { useQuery } from '@tanstack/react-query';
import type { IPageContent } from '@selfhelp/shared';

import { fetchPageByKeyword } from '@/services/pageService';
import { useDevModeStore } from '@/stores/devModeStore';
import { useAuthStore } from '@/stores/authStore';
import { useLanguageStore } from '@/stores/languageStore';
import { useServerStore } from '@/stores/serverStore';

export const pageContentQueryKey = (
    serverUrl: string | null,
    keyword: string,
    languageId: number | null,
    preview: boolean,
    authScope: 'auth' | 'anon'
): readonly unknown[] =>
    ['page', serverUrl ?? 'no-server', keyword, languageId, preview ? 'preview' : 'published', authScope] as const;

export function usePageContent(keyword: string): {
    data: IPageContent | undefined;
    isLoading: boolean;
    error: Error | null;
    refetch: () => Promise<unknown>;
} {
    const languageId = useLanguageStore((s) => s.languageId);
    const serverUrl = useServerStore((s) => s.serverUrl);
    const serverHydrated = useServerStore((s) => s.hydrated);
    const bootstrapped = useAuthStore((s) => s.bootstrapped);
    const accessToken = useAuthStore((s) => s.accessToken);
    const previewMode = useDevModeStore((s) => s.previewMode);
    const authScope = accessToken ? 'auth' : 'anon';

    const q = useQuery<IPageContent, Error>({
        queryKey: pageContentQueryKey(serverUrl, keyword, languageId, previewMode, authScope),
        queryFn: () =>
            fetchPageByKeyword(keyword, {
                languageId: languageId ?? undefined,
                preview: previewMode,
            }),
        enabled: Boolean(keyword) && Boolean(serverUrl) && serverHydrated && bootstrapped,
        // Preview content is short-lived: never cache it across mode flips.
        staleTime: previewMode ? 0 : 30 * 1000,
        gcTime: previewMode ? 0 : 5 * 60 * 1000,
    });

    return { data: q.data, isLoading: q.isLoading, error: q.error ?? null, refetch: q.refetch };
}
