/**
 * Bootstraps the server URL store from `runtimeConfig` (production builds)
 * or from SecureStore (dev/preview). Renders nothing visible.
 *
 * Production builds: `bakedBackendUrl` from `app.config.ts` extra is the
 * only allowed URL. The picker is hidden.
 *
 * Dev/preview builds: the user can change the URL via `setServerUrl()`
 * (saved back to SecureStore on change). Until a value is chosen the
 * `app/(dev)/server-picker.tsx` route renders.
 */

import { useEffect, type ReactNode } from 'react';

import { runtimeConfig } from '@/config/runtime';
import { secureStore } from '@/services/secureStore';
import { SECURE_STORE_KEYS } from '@/constants/secureStore';
import { useServerStore } from '@/stores/serverStore';

interface IServerProviderProps {
    children: ReactNode;
}

export function ServerProvider({ children }: IServerProviderProps): ReactNode {
    useEffect(() => {
        const initialise = async (): Promise<void> => {
            useServerStore.setState({
                bakedBackendUrl: runtimeConfig.bakedBackendUrl,
                isDevInstance: runtimeConfig.isDevInstance,
                canSwitchServers: runtimeConfig.isDevInstance,
            });

            if (!runtimeConfig.isDevInstance && runtimeConfig.bakedBackendUrl) {
                useServerStore.getState().setServerUrl(runtimeConfig.bakedBackendUrl);
                return;
            }

            const stored = await secureStore.get(SECURE_STORE_KEYS.SERVER_URL);
            if (stored) {
                useServerStore.getState().setServerUrl(stored);
            }
        };

        void initialise();

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
