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

import { useAuthStore } from '@/stores/authStore';
import { consumeInitialLink, subscribeToLinks } from '@/native/deepLinks';
import { registerForPushNotifications, addNotificationResponseListener } from '@/native/notifications';
import { reportPushToken } from '@/native/devicesService';
import { checkForOtaUpdate } from '@/native/updates';

export function NativeBootstrap(): null {
    useEffect(() => {
        void consumeInitialLink();
        const unsub = subscribeToLinks();
        void checkForOtaUpdate();
        return unsub;
    }, []);

    const accessToken = useAuthStore((s) => s.accessToken);

    useEffect(() => {
        if (!accessToken) return;
        let cancelled = false;
        (async () => {
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
