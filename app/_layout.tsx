/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Root layout — wraps every route in the provider stack and mounts the
 * deep-link handler. Authenticated and public routes are split into
 * `(app)` and `(public)` groups; the auth-guard inside each group does
 * the redirect.
 *
 * Routing rules implemented in `GateController`:
 *
 *   1. Wait for `ServerProvider` to finish hydrating (`hydrated` flag)
 *      and for `AuthProvider` to mark `bootstrapped`. Until both are
 *      done, render the splash and do NOT redirect — this prevents the
 *      classic cold-load race where the picker shows for 50ms and then
 *      the app routes back to the saved page.
 *   2. Dev/preview only: if `serverUrl` is missing AFTER hydration, push
 *      to the server picker, preserving the original deep-link path so
 *      we return there once a server is selected.
 *   3. Logged in + currently in `(public)` (login) → push to `(app)/`.
 *   4. Anonymous + currently in a route that requires auth → push to
 *      `/(public)/login`. Open / unauthenticated CMS pages remain
 *      accessible without forcing a login.
 *   5. Whatever route the user originally requested (deep link or
 *      browser refresh URL) is preserved — we never blindly send them
 *      to `/(app)/` if they were e.g. on `/team`.
 */

import '@/global.css';

import {
    Stack,
    useGlobalSearchParams,
    usePathname,
    useRootNavigationState,
    useRouter,
    useSegments,
} from 'expo-router';
import { useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useQuery } from '@tanstack/react-query';

import { AppProviders } from '@/providers/AppProviders';
import { installDevWarningFilter } from '@/config/devWarnings';
import { getWebPreviewRuntime } from '@/config/webPreview';
import { useAppColors } from '@/hooks/useAppColors';
import { usePages } from '@/hooks/usePages';
import { isKeywordOnMenu } from '@/components/shell/navigationUtils';
import { PageModalHost } from '@/components/shell/PageModalHost';
import { usePageModalStore } from '@/stores/pageModalStore';
import { FloatingDebugPanel } from '@/components/dev/FloatingDebugPanel';
import { PhoneFrame } from '@/components/dev/PhoneFrame';
import { PreviewDraftBanner } from '@/components/preview/PreviewDraftBanner';
import { PreviewSyncBridge } from '@/components/preview/PreviewSyncBridge';
import { ErrorScreen } from '@/components/feedback/ErrorScreen';
import { LoadingScreen } from '@/components/feedback/LoadingScreen';
import { PluginVersionMismatchBanner } from '@/components/plugin-runtime/PluginVersionMismatchBanner';
import { checkSelectedServer } from '@/services/serverSelectionService';
import { useAuthStore } from '@/stores/authStore';
import { useServerStore } from '@/stores/serverStore';

SplashScreen.preventAutoHideAsync().catch(() => {
    /* swallow — running on web or already hidden. */
});

// Hide harmless react-native-web prop warnings that otherwise stack in the
// LogBox overlay and cover the UI on web (dev only).
installDevWarningFilter();

function GateController(): null {
    const router = useRouter();
    const pathname = usePathname();
    const params = useGlobalSearchParams<{ redirect?: string }>();
    const segments = useSegments() as readonly string[];
    const navState = useRootNavigationState();
    const routeGroup = segments[0];
    const routeName = segments[1];
    const lastRedirectRef = useRef<string | null>(null);

    const accessToken = useAuthStore((s) => s.accessToken);
    const bootstrapped = useAuthStore((s) => s.bootstrapped);
    const serverUrl = useServerStore((s) => s.serverUrl);
    const serverHydrated = useServerStore((s) => s.hydrated);
    const canSwitchServers = useServerStore((s) => s.canSwitchServers);
    const previewRoutedRef = useRef(false);
    const { data: pages } = usePages();

    useEffect(() => {
        lastRedirectRef.current = null;
    }, [pathname]);

    // Web-preview: once boot completes, present the keyword the CMS asked to
    // preview. Runs once per session. `modal` decides the presentation:
    //   - on  → always as a modal over home;
    //   - off → always route full-screen to the keyword;
    //   - auto (default) → modal when the page is OFF the navigation menu (so an
    //     off-menu page, which has no menu entry, is reachable in context),
    //     otherwise route to it. `auto` waits for the nav pages to load so the
    //     on/off-menu decision is correct.
    useEffect(() => {
        if (!serverHydrated || !bootstrapped) return undefined;
        if (previewRoutedRef.current) return undefined;
        const preview = getWebPreviewRuntime();
        const keyword = preview.params.keyword;
        if (!preview.enabled || !keyword) return undefined;

        const present = (asModal: boolean): void => {
            if (previewRoutedRef.current) return;
            previewRoutedRef.current = true;
            if (asModal) {
                usePageModalStore.getState().open(keyword);
                router.replace('/(app)/');
            } else {
                router.replace({ pathname: '/[keyword]', params: { keyword } });
            }
        };

        const mode = preview.params.modal;
        if (mode === 'on') {
            present(true);
            return undefined;
        }
        if (mode === 'off') {
            present(false);
            return undefined;
        }

        // auto: decide from the nav menu. The CMS normally passes an explicit
        // on/off (it knows the page's nav position), so this is a standalone
        // fallback. The GET-only preview token can fail to read the nav list
        // (scope-bound to the session language) — so NEVER strand on home: if the
        // nav list isn't available shortly, route full-screen to the keyword.
        if (pages) {
            present(!isKeywordOnMenu(pages, keyword));
            return undefined;
        }
        const timer = setTimeout(() => present(false), 2500);
        return () => clearTimeout(timer);
    }, [bootstrapped, pages, router, serverHydrated]);

    useEffect(() => {
        if (!navState?.key) return;
        if (!serverHydrated) return;

        const replaceOnce = (key: string, href: Parameters<typeof router.replace>[0]): void => {
            if (lastRedirectRef.current === key) return;
            lastRedirectRef.current = key;
            router.replace(href);
        };

        const inPublic = routeGroup === '(public)';
        const inDev = routeGroup === '(dev)';
        const onPicker = inDev && routeName === 'server-picker';
        const onLogin = inPublic && routeName === 'login';

        if (canSwitchServers && !serverUrl && !onPicker) {
            replaceOnce('server-picker', {
                pathname: '/(dev)/server-picker',
                params: { redirect: pathname },
            });
            return;
        }

        if (!bootstrapped) return;

        // 3. Logged in but currently on the login screen → push into the app.
        if (accessToken && onLogin) {
            const redirect = typeof params.redirect === 'string' ? params.redirect : null;
            const target = redirect && redirect !== '/login' ? redirect : '/(app)/';
            replaceOnce(`login:${target}`, target);
            return;
        }

        // The server picker remains reachable while logged in so users can
        // intentionally switch tenants; the picker clears auth + cache first.
    }, [
        accessToken,
        bootstrapped,
        canSwitchServers,
        navState?.key,
        params.redirect,
        pathname,
        routeGroup,
        routeName,
        router,
        serverHydrated,
        serverUrl,
    ]);

    return null;
}

function ThemedStatusBar(): React.ReactElement {
    const colors = useAppColors();
    return <StatusBar style={colors.isDark ? 'light' : 'dark'} />;
}

function RootStackInner(): React.ReactElement {
    const bootstrapped = useAuthStore((s) => s.bootstrapped);
    const serverHydrated = useServerStore((s) => s.hydrated);
    const serverUrl = useServerStore((s) => s.serverUrl);
    const canSwitchServers = useServerStore((s) => s.canSwitchServers);

    // The Stack mounts as soon as the server is hydrated. If a server
    // is selected we *also* wait for the auth bootstrap so the first
    // paint of any protected route doesn't briefly render "logged
    // out" while the refresh is in flight. If no server is selected
    // (dev/preview before picker), there's nothing to bootstrap and
    // the gate will route to `(dev)/server-picker` immediately.
    const needsAuthBootstrap = Boolean(serverUrl);
    const ready = serverHydrated && (!needsAuthBootstrap || bootstrapped);

    useEffect(() => {
        if (ready) {
            SplashScreen.hideAsync().catch(() => {
                /* swallow — already hidden / web. */
            });
        }
    }, [ready]);

    if (!ready) return <LoadingScreen message="Starting up…" />;
    return (
        <>
            <ThemedStatusBar />
            <ServerStatusGate canSwitchServers={canSwitchServers} serverUrl={serverUrl}>
                <>
                    <PluginVersionMismatchBanner />
                    <Stack screenOptions={{ headerShown: false }}>
                        <Stack.Screen name="(app)" options={{ headerShown: false }} />
                        <Stack.Screen name="(public)" options={{ headerShown: false }} />
                        <Stack.Screen name="(dev)" options={{ headerShown: false }} />
                    </Stack>
                </>
            </ServerStatusGate>
        </>
    );
}

interface IServerStatusGateProps {
    children: React.ReactElement;
    canSwitchServers: boolean;
    serverUrl: string | null;
}

function ServerStatusGate({
    children,
    canSwitchServers,
    serverUrl,
}: IServerStatusGateProps): React.ReactElement {
    const router = useRouter();
    const pathname = usePathname();
    const inDev = (useSegments() as readonly string[])[0] === '(dev)';

    const health = useQuery({
        queryKey: ['server-health', serverUrl],
        queryFn: () => checkSelectedServer(serverUrl!),
        enabled: Boolean(serverUrl) && !inDev,
        retry: false,
        staleTime: 30_000,
    });

    if (inDev) {
        return children;
    }

    if (health.error) {
        return (
            <ErrorScreen
                title="Cannot reach selected server"
                message={`${serverUrl ?? ''}\n\n${health.error.message}`}
                onRetry={() => {
                    void health.refetch();
                }}
                actionLabel={canSwitchServers ? 'Change server' : undefined}
                onAction={
                    canSwitchServers
                        ? () =>
                              router.replace({
                                  pathname: '/(dev)/server-picker',
                                  params: { redirect: pathname },
                              })
                        : undefined
                }
            />
        );
    }

    return children;
}

export default function RootLayout(): React.ReactElement {
    return (
        <AppProviders>
            <PhoneFrame />
            <GateController />
            <PreviewSyncBridge />
            <PreviewDraftBanner />
            <RootStackInner />
            <PageModalHost />
            <FloatingDebugPanel />
        </AppProviders>
    );
}
