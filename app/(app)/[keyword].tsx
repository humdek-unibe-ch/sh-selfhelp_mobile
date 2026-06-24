/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import { useEffect, useRef } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { ErrorScreen } from '@/components/feedback/ErrorScreen';
import { LoadingScreen } from '@/components/feedback/LoadingScreen';
import { CmsPageScreen } from '@/components/renderer/CmsPageScreen';
import { isKeywordOnMenu } from '@/components/shell/navigationUtils';
import { getWebPreviewRuntime } from '@/config/webPreview';
import { usePages } from '@/hooks/usePages';
import { usePageModalStore } from '@/stores/pageModalStore';

/**
 * CMS page by keyword. Direct navigation here — a typed URL, a browser refresh,
 * or a deep link — applies the SAME app-wide rule as in-app navigation
 * (`usePageNavigation`): an OFF-MENU page (no drawer/tab entry: footer-only,
 * unassigned, headless, or unknown) is presented as a MODAL sheet over home
 * instead of a full-screen route, so closing it returns to the app rather than a
 * dead end. ON-MENU pages keep routing full-screen.
 *
 * The CMS Live Preview embed is exempt: its boot router (`app/_layout.tsx`) and
 * sync bridge already own the modal decision and honour the CMS's explicit
 * on/off/auto mode, so the route must not second-guess them.
 */
export default function PageByKeywordScreen(): React.ReactElement | null {
    const { keyword } = useLocalSearchParams<{ keyword: string }>();
    const router = useRouter();
    const { data: pages } = usePages();
    const handledRef = useRef(false);

    const inPreviewShell = getWebPreviewRuntime().params.previewShell === true;
    // Until the menu loads we treat the page as on-menu (route full-screen) so a
    // real menu link is never trapped behind a modal — matching `usePageNavigation`.
    const offMenu =
        !inPreviewShell && !!keyword && pages != null && !isKeywordOnMenu(pages, keyword);

    useEffect(() => {
        if (handledRef.current || !offMenu) return;
        handledRef.current = true;
        usePageModalStore.getState().open(keyword);
        router.replace('/(app)/');
    }, [offMenu, keyword, router]);

    if (!keyword) return <ErrorScreen title="Missing keyword" />;
    // Off-menu: the root modal host renders it over home; show a brief loader for
    // the one-tick redirect so the full-screen page never flashes underneath.
    if (offMenu) return <LoadingScreen />;
    return <CmsPageScreen keyword={keyword} />;
}
