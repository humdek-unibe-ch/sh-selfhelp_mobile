/**
 * Dev-only mode flags surfaced from the floating debug panel and the
 * server picker. Never available in production builds (the panel and
 * the toggles are not mounted unless `runtimeConfig.isDevInstance`).
 *
 *   - `previewMode`: when true, page fetches add `?preview=true` so we
 *     see draft/unpublished CMS content. Mirrors the web frontend's
 *     `sh_preview` cookie.
 *   - `phoneFrame`: web preview wraps the app in a phone-sized frame so
 *     content is laid out the way it will look on a real device. Toggle
 *     it off to use the full browser viewport for screenshots/QA.
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
}

interface IDevModeState {
    previewMode: boolean;
    phoneFrame: boolean;
    setPreviewMode: (value: boolean) => void;
    setPhoneFrame: (value: boolean) => void;
}

let writeDebounce: ReturnType<typeof setTimeout> | null = null;

function schedulePersist(state: IDevModeState): void {
    if (writeDebounce) clearTimeout(writeDebounce);
    writeDebounce = setTimeout(() => {
        const payload: IPersistedShape = {
            previewMode: state.previewMode,
            phoneFrame: state.phoneFrame,
        };
        void secureStore.set(STORAGE_KEY, JSON.stringify(payload));
    }, 100);
}

export const useDevModeStore = create<IDevModeState>((set, get) => ({
    previewMode: false,
    phoneFrame: true,
    setPreviewMode: (value) => {
        set({ previewMode: value });
        schedulePersist(get());
    },
    setPhoneFrame: (value) => {
        set({ phoneFrame: value });
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
            phoneFrame: parsed.phoneFrame ?? true,
        });
    } catch {
        /* corrupt payload — fall back to defaults */
    }
})();
