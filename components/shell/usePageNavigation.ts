/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * usePageNavigation — the single entry point for in-app navigation to a CMS page
 * by keyword (or internal href). It encodes the APP-WIDE rule:
 *
 *   - ON-MENU pages (a drawer/tab entry exists) route FULL-SCREEN via the
 *     `[keyword]` catch-all, exactly as before.
 *   - OFF-MENU pages (no menu entry: footer-only, unassigned, headless, or
 *     unknown) open as a MODAL sheet over the current page (`usePageModalStore`),
 *     so they are reachable in context and closing returns to the previous page.
 *
 * Buttons, links, and any other "go to this page" affordance call this instead of
 * `router.push` directly so the modal rule is applied uniformly. External URLs
 * (`http(s)://`) and "open in new tab" are handled by the caller, not here.
 */
import { useCallback } from 'react';
import { useRouter } from 'expo-router';

import { isKeywordOnMenu } from '@/components/shell/navigationUtils';
import { usePages } from '@/hooks/usePages';
import { usePageModalStore } from '@/stores/pageModalStore';

/** Normalise an internal target ("/impressum", "impressum", "/") to a keyword. */
function toKeyword(target: string): string {
    const trimmed = target.replace(/^\/+/, '').trim();
    return trimmed === '' ? 'home' : trimmed;
}

export function usePageNavigation(): (target: string) => void {
    const router = useRouter();
    const { data: pages } = usePages();

    return useCallback(
        (target: string): void => {
            const keyword = toKeyword(target);
            // Off-menu (or unknown until pages load → treated as on-menu so we
            // never trap a tappable menu link behind a modal) opens as a modal.
            if (pages && !isKeywordOnMenu(pages, keyword)) {
                usePageModalStore.getState().open(keyword);
                return;
            }
            router.push(`/${keyword}`);
        },
        [pages, router],
    );
}
