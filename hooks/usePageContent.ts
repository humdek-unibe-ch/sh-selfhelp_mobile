/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Fetch public page content via TanStack Query.
 *
 * Prefer `resolvePath` → `GET /pages/resolve` (parameterized routes + route_params).
 * Fall back to keyword → `GET /pages/by-keyword/{keyword}` for static auth/shell
 * pages that have no path yet (login, profile, …).
 */

import { useQuery } from '@tanstack/react-query';
import type { IPageContent } from '@selfhelp/shared';

import { fetchPageByKeyword, resolvePageByPath } from '@/services/pageService';
import { resolvePreviewRequest } from '@/services/previewPolicy';
import { useDevModeStore } from '@/stores/devModeStore';
import { useAuthStore } from '@/stores/authStore';
import { useLanguageStore } from '@/stores/languageStore';
import { useServerStore } from '@/stores/serverStore';

export const pageContentQueryKey = (
    serverUrl: string | null,
    keyword: string,
    languageId: number | null,
    preview: boolean,
    authScope: 'auth' | 'anon',
    resolvePath?: string | null,
): readonly unknown[] =>
    [
        'page',
        serverUrl ?? 'no-server',
        // Path-first cache identity when resolving by URL; keyword otherwise.
        resolvePath && resolvePath.trim() !== '' ? `__path__:${resolvePath}` : keyword,
        languageId,
        preview ? 'preview' : 'published',
        authScope,
    ] as const;

export function usePageContent(
    keyword: string,
    resolvePath?: string | null,
): {
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
    // Drafts require authentication: never request preview anonymously, or the
    // public home/login fetch 401s and the app cannot load / reach login.
    const preview = resolvePreviewRequest(previewMode, Boolean(accessToken));
    const path = resolvePath?.trim() || null;
    const canFetch = Boolean(serverUrl) && serverHydrated && bootstrapped
        && (Boolean(path) || Boolean(keyword));

    const q = useQuery<IPageContent, Error>({
        queryKey: pageContentQueryKey(serverUrl, keyword, languageId, preview, authScope, path),
        queryFn: async () => {
            const page = path
                ? await resolvePageByPath(path, {
                      languageId: languageId ?? undefined,
                      preview,
                  })
                : await fetchPageByKeyword(keyword, {
                      languageId: languageId ?? undefined,
                      preview,
                  });
            if (page.page_surface === 'cms') {
                throw new Error('CMS-surface pages are not available in the mobile public shell');
            }
            return page;
        },
        enabled: canFetch,
        // Preview content is short-lived: never cache it across mode flips.
        staleTime: preview ? 0 : 30 * 1000,
        gcTime: preview ? 0 : 5 * 60 * 1000,
    });

    return { data: q.data, isLoading: q.isLoading, error: q.error ?? null, refetch: q.refetch };
}
