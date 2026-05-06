/**
 * Reports the current device's push token to the backend. The
 * endpoint is `/auth/devices` (legacy SelfHelp). If your backend
 * doesn't yet expose it, the call fails silently — push will simply
 * not be wired up server-side.
 */

import * as Device from 'expo-device';
import { Platform } from 'react-native';

import { getApiClient } from '@/services/apiClient';
import { API_VERSION_PREFIX } from '@selfhelp/shared';

export async function reportPushToken(token: string): Promise<void> {
    try {
        await getApiClient().post(`${API_VERSION_PREFIX}/auth/devices`, {
            token,
            platform: Platform.OS,
            device_name: Device.deviceName,
            os_version: Device.osVersion,
            model: Device.modelName,
        });
    } catch {
        // Endpoint optional — see file header.
    }
}
