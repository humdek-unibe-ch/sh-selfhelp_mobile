/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Wires up native side-effects after the app providers are ready:
 *   - Deep link initial URL + listener
 *   - Push registration once the user is authenticated
 *   - OTA update check on first run
 *
 * Render this once near the root, after AuthProvider.
 */

import { useEffect } from 'react';
import { Platform } from 'react-native';

import { useAuthStore } from '@/stores/authStore';
import { consumeInitialLink, subscribeToLinks } from '@/native/deepLinks';
import { registerForPushNotifications, addNotificationResponseListener } from '@/native/notifications';
import { reportPushToken } from '@/native/devicesService';
import { checkForOtaUpdate } from '@/native/updates';
import { registerMobileHostServices } from '@/services/pluginHostServices';

export function NativeBootstrap(): null {
    useEffect(() => {
        // Expose authenticated host services to plugin mobile packages (e.g. the
        // SurveyJS WebView renderer) before any plugin style renders. Runs on
        // web too — the preview embeds the app and plugins use the same bridge.
        registerMobileHostServices();
        void consumeInitialLink();
        const unsub = subscribeToLinks();
        void checkForOtaUpdate();
        return unsub;
    }, []);

    const accessToken = useAuthStore((s) => s.accessToken);

    useEffect(() => {
        // Push notifications are a native-only concern. On web (the CMS live
        // preview runs the app in an iframe) expo-notifications logs noisy
        // "not supported on web" warnings and the listener is a no-op, so skip
        // the whole block there.
        if (Platform.OS === 'web') return undefined;
        if (!accessToken) return undefined;
        let cancelled = false;
        void (async () => {
            const result = await registerForPushNotifications();
            if (cancelled || !result.token) return;
            await reportPushToken(result.token);
        })();
        const unsub = addNotificationResponseListener(() => {
            // Could route to a specific page based on payload data here.
        });
        return () => {
            cancelled = true;
            unsub();
        };
    }, [accessToken]);

    return null;
}
