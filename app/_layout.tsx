/**
 * Root layout — wraps every route in the provider stack and mounts the
 * deep-link handler. Authenticated and public routes are split into
 * `(app)` and `(public)` groups; the auth-guard inside each group does
 * the redirect.
 */

import '@/global.css';

import { Stack, usePathname, useRootNavigationState, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';

import { AppProviders } from '@/providers/AppProviders';
import { FloatingDebugPanel } from '@/components/dev/FloatingDebugPanel';
import { PhoneFrame } from '@/components/dev/PhoneFrame';
import { LoadingScreen } from '@/components/feedback/LoadingScreen';
import { useAuthStore } from '@/stores/authStore';
import { useServerStore } from '@/stores/serverStore';

// Keep the native splash visible until our auth bootstrap finishes; the
// `RootStackInner` component below calls `hideAsync` once `bootstrapped`
// flips to true.
SplashScreen.preventAutoHideAsync().catch(() => {
    /* swallow — running on web or already hidden. */
});

function GateController(): null {
    const router = useRouter();
    const pathname = usePathname();
    const segments = useSegments() as readonly string[];
    const navState = useRootNavigationState();

    const accessToken = useAuthStore((s) => s.accessToken);
    const bootstrapped = useAuthStore((s) => s.bootstrapped);
    const serverUrl = useServerStore((s) => s.serverUrl);
    const canSwitchServers = useServerStore((s) => s.canSwitchServers);

    useEffect(() => {
        if (!navState?.key) return;

        const inApp = segments[0] === '(app)';
        const inPublic = segments[0] === '(public)';
        const inDev = segments[0] === '(dev)';
        const onPicker = inDev && segments[1] === 'server-picker';
        const onLogin = inPublic && segments[1] === 'login';

        if (canSwitchServers && !serverUrl && !onPicker) {
            router.replace({ pathname: '/(dev)/server-picker', params: { redirect: pathname } });
            return;
        }

        if (!bootstrapped) return;

        if (accessToken && !inApp && !onPicker) {
            router.replace('/(app)/');
            return;
        }

        if (!accessToken && !inApp && !inPublic && !onLogin && !onPicker) {
            router.replace('/(app)/');
        }
    }, [accessToken, bootstrapped, canSwitchServers, navState?.key, pathname, router, segments, serverUrl]);

    return null;
}

function RootStackInner(): React.ReactElement {
    const bootstrapped = useAuthStore((s) => s.bootstrapped);

    useEffect(() => {
        if (bootstrapped) {
            SplashScreen.hideAsync().catch(() => {
                /* swallow — already hidden / web. */
            });
        }
    }, [bootstrapped]);

    if (!bootstrapped) return <LoadingScreen message="Starting up…" />;
    return (
        <>
            <StatusBar style="auto" />
            <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(app)" options={{ headerShown: false }} />
                <Stack.Screen name="(public)" options={{ headerShown: false }} />
                <Stack.Screen name="(dev)" options={{ headerShown: false }} />
            </Stack>
        </>
    );
}

export default function RootLayout(): React.ReactElement {
    return (
        <AppProviders>
            <PhoneFrame>
                <GateController />
                <RootStackInner />
            </PhoneFrame>
            <FloatingDebugPanel />
        </AppProviders>
    );
}
