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
import { Alert } from 'react-native';
import { router } from 'expo-router';
import {
    pageUrlToMobileRoute,
    type INavigationPayload,
    type IPageItem,
} from '@selfhelp/shared';

import {
    isParameterizedNavigationPath,
    resolvePageNavigation,
    concretePathAfterResolve,
    splitNavigationTarget,
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

/** Open a page as a route screen, with its query parameters when it has any. */
function pushRoute(href: string, params: Record<string, string>): void {
    if (Object.keys(params).length === 0) {
        router.push(href);
        return;
    }
    router.push({ pathname: href, params });
}

function pushResolvedPage(
    keyword: string,
    /** Concrete public path (e.g. `/team-members/5`), never a `{param}` template. */
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
        // Modal host fetches via resolvePath — must be the concrete URL.
        usePageModalStore.getState().open(keyword, resolvePath, params);
        return;
    }
    usePageModalStore.getState().close();
    router.push({ pathname: mobileRoute, params });
}

/**
 * Path handed to modal / `usePageContent` after a successful `/pages/resolve`.
 *
 * Backend `canonical_url` and page `url` are often route *patterns*
 * (`/team-members/{record_id}`). Those are not fetchable — using them made
 * off-menu entry-record opens (Live Preview sync + in-app "Profil ansehen")
 * look like a no-op. Always prefer the concrete path that just resolved.
 */
export async function navigateToResolvedPath(path: string, queryParams: Record<string, string> = {}): Promise<void> {
    const languageId = useLanguageStore.getState().languageId ?? undefined;
    const preview = resolvePreviewRequest(
        useDevModeStore.getState().previewMode,
        Boolean(useAuthStore.getState().accessToken),
    );
    try {
        const page = await resolvePageByPath(path, { languageId, preview });
        if (page.page_surface === 'cms') {
            // Backend already 404s for non-admin; defensive client guard.
            return;
        }
        const resolvePath = concretePathAfterResolve(path, page);
        // The page's own route parameters win over what the link's query says.
        pushResolvedPage(page.keyword, resolvePath, { ...queryParams, ...(page.route_params ?? {}) });
    } catch (error) {
        // Never keyword-fallback a parameterized path — that drops route_params
        // and leaves entry-record / entry-record-form unhydrated.
        if (isParameterizedNavigationPath(path)) {
            const message =
                error instanceof Error && error.message.trim() !== ''
                    ? error.message
                    : 'This page could not be loaded.';
            Alert.alert('Page not found', message);
            return;
        }
        const action = resolvePageNavigation(path, getCachedPages(), getCachedNavigation());
        if (action.kind === 'modal') {
            usePageModalStore.getState().open(action.keyword, null, queryParams);
            return;
        }
        usePageModalStore.getState().close();
        pushRoute(action.href, queryParams);
    }
}

/**
 * Go to a page. The target may carry a query (`/events?events.page=2&events.q=ana`):
 * a page that keeps its state in the link, like an entry list, opens in that
 * state. `extraParams` are query parameters that did not come in the target
 * itself (the query of a deep link).
 */
export function navigateToPage(target: string, extraParams: Record<string, string> = {}): void {
    const { path, params: targetParams } = splitNavigationTarget(target);
    const params = { ...targetParams, ...extraParams };
    if (isParameterizedNavigationPath(path)) {
        void navigateToResolvedPath(path, params);
        return;
    }

    const action = resolvePageNavigation(path, getCachedPages(), getCachedNavigation());
    if (action.kind === 'modal') {
        usePageModalStore.getState().open(action.keyword, null, params);
        return;
    }
    usePageModalStore.getState().close();
    pushRoute(action.href, params);
}

export function usePageNavigation(): (target: string) => void {
    return useCallback(navigateToPage, []);
}
