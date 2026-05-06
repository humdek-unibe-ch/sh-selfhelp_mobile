/**
 * Server URL state. In dev/preview builds the user can change this at
 * runtime via the picker; the chosen value is persisted to SecureStore
 * so it survives restarts. Production builds use the baked URL from
 * `runtimeConfig.bakedBackendUrl` and don't expose the picker.
 */

import { create } from 'zustand';

interface IServerState {
    serverUrl: string | null;
    bakedBackendUrl: string | null;
    isDevInstance: boolean;
    setServerUrl: (url: string | null) => void;
    /** True when the user can swap servers at runtime. */
    canSwitchServers: boolean;
}

export const useServerStore = create<IServerState>((set) => ({
    serverUrl: null,
    bakedBackendUrl: null,
    isDevInstance: true,
    canSwitchServers: true,
    setServerUrl: (url) => set({ serverUrl: url }),
}));
