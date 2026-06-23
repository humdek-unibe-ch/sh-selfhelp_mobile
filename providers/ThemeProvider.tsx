/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * HeroUI Native theme provider.
 *
 * The provider doesn't take a theme object in v1 — themes are
 * configured through Uniwind / Tailwind tokens (see
 * `tailwind.config.ts` and `global.css`). The Mantine token tables
 * are still pulled in here so we can expose a minimal palette to
 * components that prefer JS access (e.g. dynamic SVG fills).
 *
 * Web: although HeroUI Native is marketed for iOS / Android, every
 * piece it depends on (the animation-settings + text + toast contexts,
 * the `useSyncExternalStore`-based portal host, `useReducedMotion`) runs
 * on `react-native-web`, so we mount `HeroUINativeProvider` on web too.
 * Mounting it is also required for correctness: HeroUI components read
 * `useGlobalAnimationSettings()` (created with `strict: false`, so it
 * returns `undefined` without a provider) and the portal host that
 * `Dialog`/`Select` render into. Only genuinely native-only capabilities
 * (biometrics, camera, etc.) stay unavailable on web.
 */

import { useEffect, type ReactNode } from 'react';
import { HeroUINativeProvider } from 'heroui-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Uniwind } from 'uniwind';

import { useAppColors } from '@/hooks/useAppColors';
import { useThemeStore } from '@/stores/themeStore';

interface IThemeProviderProps {
    children: ReactNode;
}

/**
 * Applies the user's colour-scheme choice (`light` / `dark` / `auto`) to
 * Uniwind, which is the single source of truth for HeroUI Native tokens
 * and `dark:` classes. `auto` maps to Uniwind's adaptive `system` theme,
 * so it follows the OS appearance and updates live when it changes.
 *
 * The root view is painted with the resolved background colour so the
 * canvas behind every screen (and the web `<body>`) is dark in dark mode.
 */
export function ThemeProvider({ children }: IThemeProviderProps): ReactNode {
    const mode = useThemeStore((s) => s.mode);
    const colors = useAppColors();

    useEffect(() => {
        Uniwind.setTheme(mode === 'auto' ? 'system' : mode);
    }, [mode]);

    return (
        <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
            <HeroUINativeProvider>{children}</HeroUINativeProvider>
        </GestureHandlerRootView>
    );
}
