/**
 * EAS Update (OTA) bootstrap. Production builds will silently check
 * for updates on launch and on app foreground; if found, the bundle
 * is downloaded and the user is prompted to reload.
 *
 * Disabled for dev builds — Expo Dev Client handles its own bundle.
 */

import * as Updates from 'expo-updates';

export async function checkForOtaUpdate(): Promise<{ applied: boolean; error?: string }> {
    if (__DEV__) return { applied: false };
    if (!Updates.isEnabled) return { applied: false };
    try {
        const result = await Updates.checkForUpdateAsync();
        if (!result.isAvailable) return { applied: false };
        await Updates.fetchUpdateAsync();
        return { applied: true };
    } catch (e) {
        return { applied: false, error: (e as Error).message };
    }
}

export async function reloadApp(): Promise<void> {
    if (Updates.isEnabled) await Updates.reloadAsync();
}
