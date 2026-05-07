/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Expo Notifications integration.
 *
 * - Sets up a foreground handler so notifications also display while
 *   the app is open.
 * - Requests permission on first call.
 * - Returns the Expo push token (FCM-on-Android, APNs-on-iOS via the
 *   Expo push service).
 *
 * On Android we additionally create a default channel; without it,
 * heads-up notifications and sound will not work on Android 8+.
 *
 * Tokens are reported to the backend via `services/devicesService.ts`
 * once the user is authenticated.
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

export interface IPushRegistrationResult {
    token: string | null;
    permissionGranted: boolean;
    reason?: string;
}

export async function registerForPushNotifications(): Promise<IPushRegistrationResult> {
    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.DEFAULT,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#228be6',
        });
    }

    if (!Device.isDevice) {
        return { token: null, permissionGranted: false, reason: 'simulator' };
    }

    const existing = await Notifications.getPermissionsAsync();
    let status = existing.status;
    if (status !== 'granted') {
        const ask = await Notifications.requestPermissionsAsync();
        status = ask.status;
    }
    if (status !== 'granted') {
        return { token: null, permissionGranted: false, reason: 'denied' };
    }

    const projectId =
        Constants.expoConfig?.extra?.eas?.projectId ??
        (Constants.easConfig as { projectId?: string } | undefined)?.projectId;

    if (!projectId) {
        return { token: null, permissionGranted: true, reason: 'no_project_id' };
    }

    try {
        const tokenObj = await Notifications.getExpoPushTokenAsync({ projectId });
        return { token: tokenObj.data, permissionGranted: true };
    } catch (e) {
        return { token: null, permissionGranted: true, reason: (e as Error).message };
    }
}

export function addForegroundNotificationListener(
    fn: (n: Notifications.Notification) => void
): () => void {
    const sub = Notifications.addNotificationReceivedListener(fn);
    return () => sub.remove();
}

export function addNotificationResponseListener(
    fn: (r: Notifications.NotificationResponse) => void
): () => void {
    const sub = Notifications.addNotificationResponseReceivedListener(fn);
    return () => sub.remove();
}
