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
import { FloatingDebugPanel } from '@/components/dev/FloatingDebugPanel';
import { PhoneFrame } from '@/components/dev/PhoneFrame';
import { ErrorScreen } from '@/components/feedback/ErrorScreen';
import { LoadingScreen } from '@/components/feedback/LoadingScreen';
import { PluginVersionMismatchBanner } from '@/components/plugin-runtime/PluginVersionMismatchBanner';
import { checkSelectedServer } from '@/services/serverSelectionService';
import { useAuthStore } from '@/stores/authStore';
import { useServerStore } from '@/stores/serverStore';

SplashScreen.preventAutoHideAsync().catch(() => {
    /* swallow — running on web or already hidden. */
});

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

    useEffect(() => {
        lastRedirectRef.current = null;
    }, [pathname]);

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
            <StatusBar style="auto" />
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
            <RootStackInner />
            <FloatingDebugPanel />
        </AppProviders>
    );
}
