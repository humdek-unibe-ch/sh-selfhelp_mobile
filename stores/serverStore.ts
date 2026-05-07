/**
 * Server URL state. In dev/preview builds the user can change this at
 * runtime via the picker; the chosen value is persisted to SecureStore
 * so it survives restarts. Production builds use the baked URL from
 * `runtimeConfig.bakedBackendUrl` and don't expose the picker.
 *
 * `hydrated` flips to `true` once `ServerProvider` has finished its
 * async init (read from runtimeConfig + SecureStore). Components that
 * gate on the URL (router, AuthProvider) wait for `hydrated` before
 * acting so a cold reload doesn't briefly think there's no server and
 * redirect to the picker, only to flip back milliseconds later.
 */

import { create } from 'zustand';

interface IServerState {
    serverUrl: string | null;
    bakedBackendUrl: string | null;
    isDevInstance: boolean;
    hydrated: boolean;
    setServerUrl: (url: string | null) => void;
    setHydrated: (value: boolean) => void;
    /** True when the user can swap servers at runtime. */
    canSwitchServers: boolean;
}

export const useServerStore = create<IServerState>((set) => ({
    serverUrl: null,
    bakedBackendUrl: null,
    isDevInstance: true,
    canSwitchServers: true,
    hydrated: false,
    setServerUrl: (url) => set({ serverUrl: url }),
    setHydrated: (value) => set({ hydrated: value }),
}));
