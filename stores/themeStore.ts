/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Colour-scheme preference, mirroring the web frontend's three-way
 * choice (`ThemeToggle`): `light`, `dark`, or `auto` (follow the OS).
 *
 * The selected mode is applied to Uniwind in `providers/ThemeProvider.tsx`
 * (`Uniwind.setTheme`), which is what actually flips HeroUI Native tokens
 * and any `dark:`-aware classes. App chrome that uses inline styles reads
 * the resolved theme through `theme/useAppColors.ts`.
 *
 * Persistence is hand-rolled (not `zustand/middleware/persist`) for the
 * same reason as `stores/devModeStore.ts`: the middleware ships
 * `import.meta.env` checks Metro can't bundle for the web classic-script
 * runtime. We reuse the secure-store wrapper (localStorage on web,
 * expo-secure-store on native).
 */

import { create } from 'zustand';

import { SECURE_STORE_KEYS } from '@/constants/secureStore';
import { secureStore } from '@/services/secureStore';

export type TThemeMode = 'light' | 'dark' | 'auto';

const STORAGE_KEY = SECURE_STORE_KEYS.THEME_MODE;
const VALID_MODES: readonly TThemeMode[] = ['light', 'dark', 'auto'];

interface IThemeState {
    mode: TThemeMode;
    setMode: (mode: TThemeMode) => void;
}

export const useThemeStore = create<IThemeState>((set) => ({
    mode: 'auto',
    setMode: (mode) => {
        set({ mode });
        void secureStore.set(STORAGE_KEY, mode);
    },
}));

void (async () => {
    try {
        const raw = await secureStore.get(STORAGE_KEY);
        if (raw && VALID_MODES.includes(raw as TThemeMode)) {
            useThemeStore.setState({ mode: raw as TThemeMode });
        }
    } catch {
        /* corrupt / unavailable storage — keep the default. */
    }
})();
