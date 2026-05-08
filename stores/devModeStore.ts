/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Dev-only mode flags surfaced from the floating debug panel and the
 * server picker. Never available in production builds (the panel and
 * the toggles are not mounted unless `runtimeConfig.isDevInstance`).
 *
 *   - `previewMode`: when true, page fetches add `?preview=true` so we
 *     see draft/unpublished CMS content. Mirrors the web frontend's
 *     `sh_preview` cookie.
 *   - `deviceFrameEnabled` / `previewDevice` / `previewOrientation`:
 *     web preview can render inside a fixed phone or tablet viewport,
 *     with portrait/landscape rotation, so layout QA behaves like a
 *     real embedded device view. Toggle it off to use the full browser
 *     viewport for screenshots/QA.
 *
 * Persistence is hand-rolled (not zustand/middleware/persist) because
 * `zustand/esm/middleware.mjs` ships `import.meta.env` checks that
 * Metro can't bundle for the web (the bundle is loaded as a classic
 * script, not a module). We persist via the same secure-store wrapper
 * used elsewhere — works on web (localStorage) and native
 * (expo-secure-store).
 */

import { create } from 'zustand';

import { SECURE_STORE_KEYS } from '@/constants/secureStore';
import { secureStore } from '@/services/secureStore';

const STORAGE_KEY = SECURE_STORE_KEYS.DEV_MODE;

interface IPersistedShape {
    previewMode?: boolean;
    phoneFrame?: boolean;
    deviceFrameEnabled?: boolean;
    previewDevice?: TPreviewDevice;
    previewOrientation?: TPreviewOrientation;
}

export type TPreviewDevice = 'phone' | 'tablet';
export type TPreviewOrientation = 'portrait' | 'landscape';

interface IDevModeState {
    previewMode: boolean;
    deviceFrameEnabled: boolean;
    previewDevice: TPreviewDevice;
    previewOrientation: TPreviewOrientation;
    setPreviewMode: (value: boolean) => void;
    setDeviceFrameEnabled: (value: boolean) => void;
    setPreviewDevice: (value: TPreviewDevice) => void;
    setPreviewOrientation: (value: TPreviewOrientation) => void;
}

let writeDebounce: ReturnType<typeof setTimeout> | null = null;

function schedulePersist(state: IDevModeState): void {
    if (writeDebounce) clearTimeout(writeDebounce);
    writeDebounce = setTimeout(() => {
        const payload: IPersistedShape = {
            previewMode: state.previewMode,
            deviceFrameEnabled: state.deviceFrameEnabled,
            previewDevice: state.previewDevice,
            previewOrientation: state.previewOrientation,
        };
        void secureStore.set(STORAGE_KEY, JSON.stringify(payload));
    }, 100);
}

export const useDevModeStore = create<IDevModeState>((set, get) => ({
    previewMode: false,
    deviceFrameEnabled: true,
    previewDevice: 'phone',
    previewOrientation: 'portrait',
    setPreviewMode: (value) => {
        set({ previewMode: value });
        schedulePersist(get());
    },
    setDeviceFrameEnabled: (value) => {
        set({ deviceFrameEnabled: value });
        schedulePersist(get());
    },
    setPreviewDevice: (value) => {
        set({ previewDevice: value });
        schedulePersist(get());
    },
    setPreviewOrientation: (value) => {
        set({ previewOrientation: value });
        schedulePersist(get());
    },
}));

void (async () => {
    try {
        const raw = await secureStore.get(STORAGE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw) as IPersistedShape;
        useDevModeStore.setState({
            previewMode: parsed.previewMode ?? false,
            deviceFrameEnabled: parsed.deviceFrameEnabled ?? parsed.phoneFrame ?? true,
            previewDevice: parsed.previewDevice ?? 'phone',
            previewOrientation: parsed.previewOrientation ?? 'portrait',
        });
    } catch {
        /* corrupt payload — fall back to defaults */
    }
})();
