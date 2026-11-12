/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';

import { SECURE_STORE_KEYS } from '@/constants/secureStore';
import { secureStore } from '@/services/secureStore';
import { debugLogger } from '@/services/debugLogger';
import { appQueryClient, QUERY_PERSIST_KEY } from '@/services/queryClient';
import { clearPersistedAuthSession } from '@/services/authSessionPersistence';
import { clearClientCaches } from '@/services/clientCaches';
import { useAuthStore } from '@/stores/authStore';

interface IClearAuthSessionOptions {
    /**
     * Also empty the client caches kept for the signed-in user: the query
     * cache (memory and persisted) and the device image cache, which holds
     * downloaded restricted assets.
     */
    clearQueries?: boolean;
    /**
     * Reset the auth-bootstrap lifecycle flag so `AuthProvider` re-runs the
     * full bootstrap. ONLY a deliberate server switch wants this. A mid-session
     * 401 / refresh failure must leave `bootstrapped` true, otherwise the gated
     * Stack remounts and the page query refetches in a loop instead of the
     * screen redirecting to login. Defaults to `false`.
     */
    resetBootstrap?: boolean;
    /** Free-form caller tag — shows up in the log so we know who wiped the session. */
    reason?: string;
}

export async function clearAuthSession(options: IClearAuthSessionOptions = {}): Promise<void> {
    debugLogger.warn(
        `clearAuthSession called${options.reason ? ` (${options.reason})` : ''}${
            options.clearQueries ? ' [+clearQueries]' : ''
        }`,
        'session',
        { stack: new Error('clearAuthSession trace').stack }
    );

    try {
        await secureStore.remove(SECURE_STORE_KEYS.REFRESH_TOKEN);
        await clearPersistedAuthSession();
    } catch {
        /* ignore */
    }

    useAuthStore.getState().clear();
    if (options.resetBootstrap) {
        useAuthStore.getState().setBootstrapped(false);
    }

    if (options.clearQueries) {
        const failed = await clearClientCaches({
            queryMemory: () => appQueryClient.clear(),
            queryStorage: () => AsyncStorage.removeItem(QUERY_PERSIST_KEY),
            imageDisk: () => Image.clearDiskCache(),
            imageMemory: () => Image.clearMemoryCache(),
        });
        if (failed.length > 0) {
            debugLogger.warn(`client caches not fully cleared: ${failed.join(', ')}`, 'session');
        }
    }
}

export function removeAuthScopedQueries(): void {
    appQueryClient.removeQueries({ queryKey: ['user-data'] });
    appQueryClient.removeQueries({ queryKey: ['pages'] });
    appQueryClient.removeQueries({ queryKey: ['page'] });
}

export function invalidateAuthScopedQueries(): void {
    void appQueryClient.invalidateQueries({ queryKey: ['user-data'] });
    void appQueryClient.invalidateQueries({ queryKey: ['pages'] });
    void appQueryClient.invalidateQueries({ queryKey: ['page'] });
}
