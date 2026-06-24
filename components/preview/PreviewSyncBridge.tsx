/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * PreviewSyncBridge — the MOBILE half of the CMS Live Preview bridge.
 *
 * Mounted once at the root, it stays DORMANT during normal use and only
 * activates when the mobile web image is embedded in the CMS **Live Preview**
 * shell with `previewShell=1` (the shell appends it, alongside `parentOrigin`,
 * to the mobile iframe `src` — see the frontend `buildMobilePreviewUrl`). The
 * activation is read once from the cached web-preview runtime, so it survives the
 * in-app navigations that drop the query string.
 *
 * When active it mirrors the web `PreviewShellBridge`:
 *   - reports every in-app navigation up to the shell
 *     (`selfhelp-preview:navigated` with the page keyword + the preview locale),
 *     so the shell can drive the WEB frame to the same page;
 *   - accepts a `selfhelp-preview:navigate` command from the shell and follows it
 *     with NO reload, applying the same app-wide rule as in-app navigation: an
 *     ON-MENU page routes full-screen (soft Expo Router `replace`) while an
 *     OFF-MENU page (footer-only / unassigned / headless / unknown) opens as a
 *     MODAL sheet over the current page (`usePageModalStore`), exactly like the
 *     normal mobile app. A missing keyword lands on the standard page-not-found
 *     state.
 *
 * Loop safety: the shell owns the canonical page and ignores the echo of a
 * command it just sent (its per-frame "expected keyword" guard), and this bridge
 * skips a command for the page it is already on — so web↔mobile never ping-pong.
 *
 * Security: messages are only accepted from / sent to the shell origin handed in
 * via `parentOrigin` (the cross-origin dev case), never `'*'`; foreign / malformed
 * messages are dropped by `isPreviewBridgeMessage`. Web-only (native is a no-op).
 *
 * @module components/preview/PreviewSyncBridge
 */

import { useCallback, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import {
    PREVIEW_BRIDGE_MESSAGE,
    isPreviewBridgeMessage,
    previewKeywordFromPath,
    type TPreviewBridgeMessage,
} from '@selfhelp/shared';

import { isKeywordOnMenu } from '@/components/shell/navigationUtils';
import { getWebPreviewRuntime } from '@/config/webPreview';
import { usePages } from '@/hooks/usePages';
import { usePageModalStore } from '@/stores/pageModalStore';

export function PreviewSyncBridge(): null {
    const pathname = usePathname();
    const router = useRouter();
    // An off-menu page can be presented as a modal over the current route; when
    // it is open that keyword (not the `/` path) is what the frame visibly shows.
    const modalKeyword = usePageModalStore((s) => s.keyword);
    // The menu tree drives the off-menu rule applied to inbound navigate commands
    // (see `goToKeyword`); read through a ref so the once-registered listener sees
    // the latest pages without re-subscribing.
    const { data: pages } = usePages();

    // Resolved once on mount; refs so the listener (registered once) always reads
    // the latest without re-subscribing.
    const activeRef = useRef(false);
    const parentOriginRef = useRef<string | null>(null);
    const localeRef = useRef<string | null>(null);
    const currentKeywordRef = useRef<string | null>(null);
    const lastSentRef = useRef<string | null>(null);
    const pagesRef = useRef(pages);

    useEffect(() => {
        pagesRef.current = pages;
    }, [pages]);

    const postToParent = useCallback((message: TPreviewBridgeMessage): void => {
        if (!activeRef.current || typeof window === 'undefined') return;
        const parent = window.parent;
        const target = parentOriginRef.current;
        if (!parent || parent === window || !target) return;
        parent.postMessage(message, target);
    }, []);

    // Activate (once): read the cached runtime, capture the shell origin, and wire
    // the inbound command listener.
    useEffect(() => {
        if (Platform.OS !== 'web' || typeof window === 'undefined') return undefined;
        if (window.parent === window) return undefined; // not embedded → never a preview frame

        const preview = getWebPreviewRuntime();
        if (!preview.enabled || !preview.params.previewShell) return undefined;
        const parentOrigin = preview.params.parentOrigin ?? window.location.origin;
        if (!parentOrigin) return undefined;

        activeRef.current = true;
        parentOriginRef.current = parentOrigin;
        localeRef.current = preview.params.language ?? null;

        const goToKeyword = (keyword: string | null): void => {
            if (!keyword) {
                usePageModalStore.getState().close();
                router.replace('/(app)/');
                return;
            }
            // Apply the SAME app-wide rule as in-app navigation
            // (components/shell/usePageNavigation.ts): an OFF-MENU page (footer-only,
            // unassigned, headless, or unknown) opens as a MODAL sheet over the
            // current page; an ON-MENU page routes full-screen. Until the pages load
            // we treat the target as on-menu so a real menu link is never trapped
            // behind a modal.
            const knownPages = pagesRef.current;
            if (knownPages && !isKeywordOnMenu(knownPages, keyword)) {
                usePageModalStore.getState().open(keyword);
                return;
            }
            usePageModalStore.getState().close();
            router.replace({ pathname: '/[keyword]', params: { keyword } });
        };

        const onMessage = (event: MessageEvent): void => {
            if (event.origin !== parentOriginRef.current) return;
            if (!isPreviewBridgeMessage(event.data)) return;
            if (event.data.type !== PREVIEW_BRIDGE_MESSAGE.NAVIGATE) return;
            const next = event.data.keyword;
            // Already there → ignore (defends against a redundant command).
            if ((next ?? null) === (currentKeywordRef.current ?? null)) return;
            goToKeyword(next ?? null);
        };
        window.addEventListener('message', onMessage);

        postToParent({ type: PREVIEW_BRIDGE_MESSAGE.READY, source: 'mobile' });

        return () => window.removeEventListener('message', onMessage);
    }, [postToParent, router]);

    // Report each navigation (incl. an open preview modal) up to the shell.
    useEffect(() => {
        if (!activeRef.current) return;
        const keyword = modalKeyword ?? previewKeywordFromPath(pathname);
        currentKeywordRef.current = keyword;
        if (lastSentRef.current === (keyword ?? null)) return; // de-noise repeats
        lastSentRef.current = keyword ?? null;
        postToParent({
            type: PREVIEW_BRIDGE_MESSAGE.NAVIGATED,
            source: 'mobile',
            keyword,
            href: typeof window !== 'undefined' ? `${window.location.pathname}${window.location.search}` : '',
            locale: localeRef.current,
        });
    }, [pathname, modalKeyword, postToParent]);

    return null;
}
