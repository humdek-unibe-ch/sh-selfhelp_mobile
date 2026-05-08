/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Bootstraps the server URL store from `runtimeConfig` (production builds)
 * or from SecureStore (dev/preview). Renders nothing visible.
 *
 * On Expo Web we normalize loopback hosts to `localhost` so browser-only
 * features such as Mercure cookie auth do not end up split between
 * `localhost` and `127.0.0.1`.
 */

import { useEffect, type ReactNode } from 'react';
import { Platform } from 'react-native';

import { runtimeConfig } from '@/config/runtime';
import { SECURE_STORE_KEYS } from '@/constants/secureStore';
import { debugLogger } from '@/services/debugLogger';
import { canonicalizeLoopbackHost } from '@/services/serverSelectionService';
import { secureStore } from '@/services/secureStore';
import { useServerStore } from '@/stores/serverStore';

interface IServerProviderProps {
    children: ReactNode;
}

let hydrationPromise: Promise<void> | null = null;

async function hydrateServerStore(): Promise<void> {
    if (useServerStore.getState().hydrated) return;

    const normalizeForCurrentPlatform = (url: string): string =>
        Platform.OS === 'web' ? canonicalizeLoopbackHost(url, 'localhost') : url;

    debugLogger.info('hydration start', 'ServerProvider', {
        bakedBackendUrl: runtimeConfig.bakedBackendUrl,
        isDevInstance: runtimeConfig.isDevInstance,
    });
    useServerStore.setState({
        bakedBackendUrl: runtimeConfig.bakedBackendUrl,
        isDevInstance: runtimeConfig.isDevInstance,
        canSwitchServers: runtimeConfig.isDevInstance,
    });

    try {
        if (!runtimeConfig.isDevInstance && runtimeConfig.bakedBackendUrl) {
            const normalized = normalizeForCurrentPlatform(runtimeConfig.bakedBackendUrl);
            useServerStore.getState().setServerUrl(normalized);
            debugLogger.info(`using baked URL ${normalized}`, 'ServerProvider');
            return;
        }

        const stored = await secureStore.get(SECURE_STORE_KEYS.SERVER_URL);
        if (stored) {
            const normalized = normalizeForCurrentPlatform(stored);
            debugLogger.info(`restored server URL ${normalized}`, 'ServerProvider');
            useServerStore.getState().setServerUrl(normalized);
        } else {
            debugLogger.info('no stored server URL -> picker required', 'ServerProvider');
        }
    } finally {
        useServerStore.getState().setHydrated(true);
        debugLogger.info('hydrated', 'ServerProvider');
    }
}

export function ServerProvider({ children }: IServerProviderProps): ReactNode {
    useEffect(() => {
        if (!hydrationPromise) {
            hydrationPromise = hydrateServerStore();
        }

        const unsubscribe = useServerStore.subscribe((state, prev) => {
            if (state.serverUrl === prev.serverUrl) return;
            if (!state.canSwitchServers) return;
            if (state.serverUrl) {
                void secureStore.set(SECURE_STORE_KEYS.SERVER_URL, state.serverUrl);
            } else {
                void secureStore.remove(SECURE_STORE_KEYS.SERVER_URL);
            }
        });

        return () => unsubscribe();
    }, []);

    return children;
}
