/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Cross-platform secure storage. Uses `expo-secure-store` on native and
 * falls back to `localStorage` on web (dev preview only — production
 * builds run on iOS/Android where the native impl is used).
 */

import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

import type { TSecureStoreKey } from '@/constants/secureStore';

const isWeb = Platform.OS === 'web';

export const secureStore = {
    async get(key: TSecureStoreKey): Promise<string | null> {
        if (isWeb) {
            try {
                return globalThis.localStorage?.getItem(key) ?? null;
            } catch {
                return null;
            }
        }
        return SecureStore.getItemAsync(key);
    },
    async set(key: TSecureStoreKey, value: string): Promise<void> {
        if (isWeb) {
            try {
                globalThis.localStorage?.setItem(key, value);
            } catch {
                // ignore — Safari private mode etc.
            }
            return;
        }
        await SecureStore.setItemAsync(key, value);
    },
    async remove(key: TSecureStoreKey): Promise<void> {
        if (isWeb) {
            try {
                globalThis.localStorage?.removeItem(key);
            } catch {
                // ignore
            }
            return;
        }
        await SecureStore.deleteItemAsync(key);
    },
};
