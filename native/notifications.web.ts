/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Web no-op implementation for native push notifications.
 *
 * Keeping this module free of `expo-notifications` is intentional. Importing
 * that package on web installs an unsupported push-token listener as a module
 * side effect, even when the app never calls the registration helpers.
 */

export interface IPushRegistrationResult {
    token: string | null;
    permissionGranted: boolean;
    reason?: string;
}

export async function registerForPushNotifications(): Promise<IPushRegistrationResult> {
    return { token: null, permissionGranted: false, reason: 'web' };
}

export function addForegroundNotificationListener(
    _listener: (notification: unknown) => void,
): () => void {
    return () => undefined;
}

export function addNotificationResponseListener(
    _listener: (response: unknown) => void,
): () => void {
    return () => undefined;
}
