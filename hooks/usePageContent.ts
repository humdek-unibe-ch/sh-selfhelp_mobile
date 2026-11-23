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

import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import type { IPageContent } from '@selfhelp/shared';

import { fetchPageByKeyword, resolvePageByPath } from '@/services/pageService';
import { shouldCountPageView } from '@/services/pageViewPolicy';
import { resolvePreviewRequest } from '@/services/previewPolicy';
import { scheduleValidUntilRefetch } from '@/services/validUntil';
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

interface IUsePageContentOptions {
    /**
     * The caller is a screen that opens the page (the page, profile and login screens): its first fetch counts as
     * the page view (`X-Page-View: 1`, contract C7) and a screen that opens always reads the page again, so
     * every opening is seen. A background reader leaves it off.
     */
    countView?: boolean;
}

export function usePageContent(
    keyword: string,
    resolvePath?: string | null,
    options: IUsePageContentOptions = {},
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
    const countView = options.countView === true;
    const identity = `${keyword}|${path ?? ''}`;
    // The page this screen already counted: one view per opening, however often the page is read again.
    const countedIdentityRef = useRef<string | null>(null);

    const q = useQuery<IPageContent, Error>({
        queryKey: pageContentQueryKey(serverUrl, keyword, languageId, preview, authScope, path),
        queryFn: async () => {
            const view = shouldCountPageView({
                countView,
                preview,
                countedIdentity: countedIdentityRef.current,
                identity,
            });
            if (view) {
                countedIdentityRef.current = identity;
            }
            const page = path
                ? await resolvePageByPath(path, {
                      languageId: languageId ?? undefined,
                      preview,
                      view,
                  })
                : await fetchPageByKeyword(keyword, {
                      languageId: languageId ?? undefined,
                      preview,
                      view,
                  });
            if (page.page_surface === 'cms') {
                throw new Error('CMS-surface pages are not available in the mobile public shell');
            }
            return page;
        },
        enabled: canFetch,
        // Opening a page screen reads the page again, so the opening is counted and the screen starts current.
        refetchOnMount: countView ? 'always' : true,
        // Preview content is short-lived: never cache it across mode flips.
        staleTime: preview ? 0 : 30 * 1000,
        gcTime: preview ? 0 : 5 * 60 * 1000,
    });

    // The page's own clock: one read at `sync.valid_until` (plus up to 2 s), while the page is open.
    const validUntil = q.data?.sync?.valid_until ?? null;
    const refetchRef = useRef(q.refetch);
    refetchRef.current = q.refetch;
    const lastFiredAtRef = useRef<number | null>(null);
    useEffect(
        () =>
            scheduleValidUntilRefetch(
                {
                    validUntil,
                    isForeground: () => AppState.currentState !== 'background',
                    refetch: () => {
                        void refetchRef.current();
                    },
                    lastFiredAt: lastFiredAtRef.current,
                    onFired: (at) => {
                        lastFiredAtRef.current = at;
                    },
                },
                { now: Date.now },
            ),
        [validUntil],
    );

    return { data: q.data, isLoading: q.isLoading, error: q.error ?? null, refetch: q.refetch };
}
