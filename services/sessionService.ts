/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import AsyncStorage from '@react-native-async-storage/async-storage';

import { SECURE_STORE_KEYS } from '@/constants/secureStore';
import { secureStore } from '@/services/secureStore';
import { debugLogger } from '@/services/debugLogger';
import { appQueryClient, QUERY_PERSIST_KEY } from '@/services/queryClient';
import { clearPersistedAuthSession } from '@/services/authSessionPersistence';
import { useAuthStore } from '@/stores/authStore';

interface IClearAuthSessionOptions {
    clearQueries?: boolean;
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
    useAuthStore.getState().setBootstrapped(false);

    if (options.clearQueries) {
        appQueryClient.clear();
        try {
            await AsyncStorage.removeItem(QUERY_PERSIST_KEY);
        } catch {
            /* ignore */
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
