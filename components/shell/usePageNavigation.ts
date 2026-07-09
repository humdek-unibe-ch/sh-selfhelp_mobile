/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * navigateToPage / usePageNavigation — THE single, app-wide entry point for
 * in-app navigation to a CMS page by keyword (or internal href). It encodes the
 * GLOBAL rule, enforced EVERYWHERE a page is loaded:
 *
 *   - ON-MENU pages (a drawer/tab entry exists) route FULL-SCREEN via the
 *     `[keyword]` catch-all, exactly as before.
 *   - OFF-MENU pages (no entry on resolved `mobile_drawer` / `mobile_bottom_tabs`)
 *     open as a MODAL sheet over the current page (`usePageModalStore`),
 *     so they are reachable in context and closing returns to the previous page.
 *
 * Parameterized public URLs (`/team-members/5`) are resolved through
 * `pageService.resolvePageByPath()` so route params hydrate entry-record pages.
 *
 * Every "go to this page" affordance — links, buttons, action icons, form
 * redirects, and plugin host redirects (e.g. a survey's "redirect on completion")
 * — calls `navigateToPage` (or `usePageNavigation`, which just returns it) instead
 * of `router.push` directly, so the modal rule is applied uniformly.
 *
 * The rule is applied DIRECTLY here (it opens the modal store itself rather than
 * deferring to the `[keyword]` route guard) so it behaves identically in the
 * native app AND inside the web-export live preview — where the route guard
 * intentionally defers to the preview boot router and would otherwise let an
 * off-menu redirect render full-screen.
 *
 * External URLs (`http(s)://`) and "open in new tab" are handled by the caller,
 * not here.
 */
import { useCallback } from 'react';
import { router } from 'expo-router';
import type { IPageItem } from '@selfhelp/shared';
import { pageUrlToMobileRoute } from '@selfhelp/shared';

import {
    isParameterizedNavigationPath,
    normalizeNavigationTarget,
    resolvePageNavigation,
} from '@/components/shell/navigationUtils';
import { navigationQueryKey } from '@/hooks/useNavigation';
import { pagesQueryKey } from '@/hooks/usePages';
import { appQueryClient } from '@/services/queryClient';
import { resolvePageByPath } from '@/services/pageService';
import { resolvePreviewRequest } from '@/services/previewPolicy';
import { useAuthStore } from '@/stores/authStore';
import { useDevModeStore } from '@/stores/devModeStore';
import { useLanguageStore } from '@/stores/languageStore';
import { usePageModalStore } from '@/stores/pageModalStore';
import { useServerStore } from '@/stores/serverStore';
import type { INavigationPayload } from '@selfhelp/shared';

/**
 * Read the menu pages currently cached for the active server / language / auth
 * scope. Navigation happens on user interaction, by which time `usePages()` has
 * populated this cache; reading it imperatively lets the rule run outside React
 * (plugin host services, form submit handlers) with the SAME data the
 * drawer/tabs render from.
 */
function getCachedPages(): IPageItem[] | undefined {
    const serverUrl = useServerStore.getState().serverUrl;
    const languageId = useLanguageStore.getState().languageId;
    const authScope = useAuthStore.getState().accessToken ? 'auth' : 'anon';
    return appQueryClient.getQueryData<IPageItem[]>(pagesQueryKey(serverUrl, languageId, authScope));
}

/**
 * GLOBAL imperative navigation to a CMS page by keyword/href. Applies the modal
 * rule ({@link resolvePageNavigation}) DIRECTLY against the cached menu so it
 * behaves identically in the native app AND the web-export live preview.
 */
function getCachedNavigation(): INavigationPayload | undefined {
    const serverUrl = useServerStore.getState().serverUrl;
    const languageId = useLanguageStore.getState().languageId;
    const authScope = useAuthStore.getState().accessToken ? 'auth' : 'anon';
    return appQueryClient.getQueryData<INavigationPayload>(
        navigationQueryKey(serverUrl, languageId, authScope),
    );
}

function pushResolvedPage(
    keyword: string,
    resolvePath: string,
    routeParams: Record<string, string | number | undefined>,
): void {
    const pages = getCachedPages();
    const navigation = getCachedNavigation();
    const mobileRoute = pageUrlToMobileRoute(resolvePath, keyword);
    const action = resolvePageNavigation(mobileRoute, pages, navigation);
    const params: Record<string, string> = {};
    for (const [key, value] of Object.entries(routeParams)) {
        if (value !== undefined && value !== null) {
            params[key] = String(value);
        }
    }

    if (action.kind === 'modal') {
        usePageModalStore.getState().open(keyword, resolvePath);
        return;
    }
    usePageModalStore.getState().close();
    router.push({ pathname: mobileRoute, params });
}

export async function navigateToResolvedPath(path: string): Promise<void> {
    const languageId = useLanguageStore.getState().languageId ?? undefined;
    const preview = resolvePreviewRequest(
        useDevModeStore.getState().previewMode,
        Boolean(useAuthStore.getState().accessToken),
    );
    try {
        const page = await resolvePageByPath(path, { languageId, preview });
        const resolvePath = (page.canonical_url ?? page.url ?? path).replace(/\/+$/, '') || path;
        pushResolvedPage(page.keyword, resolvePath, page.route_params ?? {});
    } catch {
        const action = resolvePageNavigation(path, getCachedPages(), getCachedNavigation());
        if (action.kind === 'modal') {
            usePageModalStore.getState().open(action.keyword);
            return;
        }
        usePageModalStore.getState().close();
        router.push(action.href as `/${string}`);
    }
}

export function navigateToPage(target: string): void {
    if (isParameterizedNavigationPath(target)) {
        void navigateToResolvedPath(normalizeNavigationTarget(target));
        return;
    }

    const action = resolvePageNavigation(target, getCachedPages(), getCachedNavigation());
    if (action.kind === 'modal') {
        usePageModalStore.getState().open(action.keyword);
        return;
    }
    usePageModalStore.getState().close();
    router.push(action.href as `/${string}`);
}

export function usePageNavigation(): (target: string) => void {
    return useCallback(navigateToPage, []);
}
