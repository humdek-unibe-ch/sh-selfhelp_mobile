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
 *   - OFF-MENU pages (no menu entry: footer-only, unassigned, headless, or
 *     unknown) open as a MODAL sheet over the current page (`usePageModalStore`),
 *     so they are reachable in context and closing returns to the previous page.
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

import { resolvePageNavigation } from '@/components/shell/navigationUtils';
import { pagesQueryKey } from '@/hooks/usePages';
import { appQueryClient } from '@/services/queryClient';
import { useAuthStore } from '@/stores/authStore';
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
export function navigateToPage(target: string): void {
    const action = resolvePageNavigation(target, getCachedPages());
    if (action.kind === 'modal') {
        usePageModalStore.getState().open(action.keyword);
        return;
    }
    router.push(`/${action.keyword}`);
}

export function usePageNavigation(): (target: string) => void {
    return useCallback(navigateToPage, []);
}
