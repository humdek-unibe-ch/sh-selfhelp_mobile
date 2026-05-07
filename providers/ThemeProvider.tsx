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
 * Web preview: HeroUI Native officially targets iOS / Android. On
 * web we still render — Uniwind treats the classes the same way and
 * unsupported native primitives degrade gracefully via our style
 * impls (which render plain `View`/`Text`).
 */

import { type ReactNode } from 'react';
import { Platform } from 'react-native';
import { HeroUINativeProvider } from 'heroui-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

interface IThemeProviderProps {
    children: ReactNode;
}

export function ThemeProvider({ children }: IThemeProviderProps): ReactNode {
    if (Platform.OS === 'web') {
        return <GestureHandlerRootView style={{ flex: 1 }}>{children}</GestureHandlerRootView>;
    }
    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <HeroUINativeProvider>{children}</HeroUINativeProvider>
        </GestureHandlerRootView>
    );
}
