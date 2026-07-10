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
 *   - mirrors the shared colour scheme both ways: it applies a
 *     `selfhelp-preview:set-preferences` push from the shell and reports local
 *     theme changes with `selfhelp-preview:preferences-changed`. Language is
 *     URL-bound and applied by a clean frame remount, never through this live
 *     bridge.
 *
 * Loop safety: READY and outbound NAVIGATED messages are delayed until the
 * initial preview route is committed, then the shell owns the canonical page
 * and ignores the echo of a command it just sent. This bridge also skips
 * commands for the page it already shows.
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
    arePreviewPreferencesEqual,
    isPreviewBridgeMessage,
    type IPreviewPreferences,
    type TPreviewBridgeMessage,
} from '@selfhelp/shared';

import { isKeywordOnResolvedMobileMenu } from '@/components/shell/navigationUtils';
import { navigateToResolvedPath } from '@/components/shell/usePageNavigation';
import { getWebPreviewRuntime } from '@/config/webPreview';
import { useNavigation } from '@/hooks/useNavigation';
import { usePages } from '@/hooks/usePages';
import {
    applyPreviewThemePreferences,
    previewThemePreferences,
} from '@/services/previewPreferenceSync';
import {
    previewKeywordFromPathname,
    shouldAnnouncePreviewReady,
    shouldReportPreviewNavigation,
} from '@/services/previewBridgeState';
import { useAuthStore } from '@/stores/authStore';
import { usePageModalStore } from '@/stores/pageModalStore';
import { useServerStore } from '@/stores/serverStore';
import { useThemeStore } from '@/stores/themeStore';

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
    const { data: navigation } = useNavigation();
    const authBootstrapped = useAuthStore((s) => s.bootstrapped);
    const serverHydrated = useServerStore((s) => s.hydrated);

    // Shared colour-scheme (theme), synced BOTH ways with the shell. Read as
    // reactive store state so a local change (mobile profile) drives the outbound
    // effect; applied via the store setter when the shell pushes a change. Language
    // is NOT synced here — it is bound to the iframe URL and changes via a clean
    // remount driven by the shell (see `applyPreferences`).
    const themeMode = useThemeStore((s) => s.mode);

    // Resolved once on mount; refs so the listener (registered once) always reads
    // the latest without re-subscribing.
    const activeRef = useRef(false);
    const parentOriginRef = useRef<string | null>(null);
    const localeRef = useRef<string | null>(null);
    const currentKeywordRef = useRef<string | null>(null);
    const lastSentRef = useRef<string | null | undefined>(undefined);
    const pagesRef = useRef(pages);
    const navigationRef = useRef(navigation);
    const readySentRef = useRef(false);
    // Loop guard for theme sync: the last prefs we SENT to or RECEIVED from the
    // shell. Seeded on activation so the initial state is never echoed back.
    const lastSyncedPrefsRef = useRef<IPreviewPreferences | null>(null);

    useEffect(() => {
        pagesRef.current = pages;
    }, [pages]);

    useEffect(() => {
        navigationRef.current = navigation;
    }, [navigation]);

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
        // Seed the theme guard with the current scheme so the mount never echoes
        // it back; the shell's READY→SET_PREFERENCES then makes the web pane
        // authoritative for the initial theme.
        lastSyncedPrefsRef.current = previewThemePreferences(
            useThemeStore.getState().mode,
        );

        // Apply a prefs change pushed from the shell: flip the THEME only, with no
        // reload. Language is intentionally NOT synced here — it is bound to the
        // iframe URL and changes via a clean remount driven by the shell. Pushing a
        // language over postMessage meant calling `setLanguage` (which rotates the
        // scoped token AND runs a full `invalidateQueries`); under the cross-frame
        // echo that could loop into a query-invalidation storm that emptied the
        // menu/tabs and tripped Chromium's navigation throttle. Theme is cheap and
        // synchronous, so it stays a live two-way sync.
        const applyPreferences = (prefs: IPreviewPreferences): void => {
            const themeStore = useThemeStore.getState();
            lastSyncedPrefsRef.current = applyPreviewThemePreferences(
                prefs,
                themeStore.mode,
                themeStore.setMode,
            );
        };

        const goToKeyword = (keyword: string | null, resolvePath?: string | null): void => {
            if (resolvePath) {
                void navigateToResolvedPath(resolvePath);
                return;
            }
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
            if (knownPages && !isKeywordOnResolvedMobileMenu(knownPages, keyword, navigationRef.current)) {
                usePageModalStore.getState().open(keyword, resolvePath ?? null);
                return;
            }
            usePageModalStore.getState().close();
            router.replace({ pathname: '/[keyword]', params: { keyword } });
        };

        const onMessage = (event: MessageEvent): void => {
            if (event.origin !== parentOriginRef.current) return;
            if (!isPreviewBridgeMessage(event.data)) return;
            if (event.data.type === PREVIEW_BRIDGE_MESSAGE.SET_PREFERENCES) {
                applyPreferences(event.data.preferences);
                return;
            }
            if (event.data.type !== PREVIEW_BRIDGE_MESSAGE.NAVIGATE) return;
            const next = event.data.keyword;
            const nextPath = event.data.path ?? null;
            // Already there → ignore (defends against a redundant command).
            if (!nextPath && (next ?? null) === (currentKeywordRef.current ?? null)) return;
            if (nextPath) {
                void navigateToResolvedPath(nextPath);
                return;
            }
            goToKeyword(next ?? null);
        };
        window.addEventListener('message', onMessage);

        return () => window.removeEventListener('message', onMessage);
    }, [postToParent, router]);

    // Track every visible route immediately, but only report navigation after
    // READY. During bootstrap Expo briefly exposes its root route before
    // GateController commits the requested page. Publishing that temporary
    // route lets the shell overwrite its canonical keyword while the app is
    // still calling router.replace(), recreating the navigation flood that the
    // READY guard prevents.
    useEffect(() => {
        if (!activeRef.current) return;
        const preview = getWebPreviewRuntime();
        const keyword = modalKeyword ?? previewKeywordFromPathname(pathname, preview.baseUrl);
        currentKeywordRef.current = keyword;
        if (
            !shouldReportPreviewNavigation({
                active: activeRef.current,
                readySent: readySentRef.current,
                currentKeyword: keyword,
                lastSentKeyword: lastSentRef.current,
            })
        ) {
            return;
        }
        lastSentRef.current = keyword ?? null;
        // Modal sheets are keyword-addressed; the underlay pathname is not the
        // visible page and must not drive shell path-resolve (that desynced
        // Live Preview). Only report a public path for full-screen routes.
        const publicPath =
            modalKeyword ||
            typeof pathname !== 'string' ||
            !pathname.startsWith('/') ||
            pathname.includes('[')
                ? null
                : pathname.replace(/\/+$/, '') || '/';
        postToParent({
            type: PREVIEW_BRIDGE_MESSAGE.NAVIGATED,
            source: 'mobile',
            keyword,
            href: typeof window !== 'undefined' ? `${window.location.pathname}${window.location.search}` : '',
            ...(publicPath ? { path: publicPath } : {}),
            locale: localeRef.current,
        });
    }, [pathname, modalKeyword, postToParent]);

    // Announce READY only after GateController has completed the initial preview
    // route. The shell answers READY with NAVIGATE(canonicalKeyword); if READY is
    // emitted during bootstrap, that command races GateController's own
    // router.replace() and can create a navigation flood that strands the frame
    // on "Starting up…". Once the initial keyword/modal is visible, the returned
    // command matches currentKeywordRef and is safely ignored as a no-op.
    useEffect(() => {
        const preview = getWebPreviewRuntime();
        const currentKeyword = modalKeyword ?? previewKeywordFromPathname(pathname, preview.baseUrl);
        if (
            !shouldAnnouncePreviewReady({
                active: activeRef.current,
                alreadySent: readySentRef.current,
                serverHydrated,
                authBootstrapped,
                currentKeyword,
                initialKeyword: preview.params.keyword,
            })
        ) {
            return;
        }

        readySentRef.current = true;
        postToParent({ type: PREVIEW_BRIDGE_MESSAGE.READY, source: 'mobile' });
    }, [authBootstrapped, modalKeyword, pathname, postToParent, serverHydrated]);

    // Report a LOCAL THEME change (dark/light switched in the mobile profile) up
    // to the shell so the web pane follows. The guard skips the echo of a value
    // the shell just pushed (and the seeded initial state), so the two panes never
    // ping-pong. Language is not reported (it is URL-bound, see `applyPreferences`).
    useEffect(() => {
        if (!activeRef.current) return;
        const prefs = previewThemePreferences(themeMode);
        if (arePreviewPreferencesEqual(lastSyncedPrefsRef.current, prefs)) return;
        lastSyncedPrefsRef.current = prefs;
        postToParent({
            type: PREVIEW_BRIDGE_MESSAGE.PREFERENCES_CHANGED,
            source: 'mobile',
            preferences: prefs,
        });
    }, [themeMode, postToParent]);

    return null;
}
