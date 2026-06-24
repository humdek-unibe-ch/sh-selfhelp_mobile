/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Pure preference boundary for the CMS Live Preview bridge.
 *
 * Theme is safe to synchronize live. Language is deliberately URL-bound because
 * applying it through `setLanguage()` rotates the scoped preview token and
 * invalidates every query. Under a two-way bridge that created the request loop
 * which stranded startup and emptied the drawer/tab page list.
 */

import type {
    IPreviewPreferences,
    TPreviewColorScheme,
} from '@selfhelp/shared';

export function resolveInitialLocale(
    previewLocale: string | null,
    storedLocale: string | null,
    detectedLocale: string,
): string {
    return previewLocale ?? storedLocale ?? detectedLocale;
}

export function isPreviewLanguageControlLocked(
    previewEnabled: boolean,
    previewShell: boolean,
): boolean {
    return previewEnabled && previewShell;
}

export function previewThemePreferences(
    colorScheme: TPreviewColorScheme,
): IPreviewPreferences {
    return { colorScheme, locale: null };
}

export function applyPreviewThemePreferences(
    preferences: IPreviewPreferences,
    currentMode: TPreviewColorScheme,
    setMode: (mode: TPreviewColorScheme) => void,
): IPreviewPreferences {
    if (currentMode !== preferences.colorScheme) {
        setMode(preferences.colorScheme);
    }

    return previewThemePreferences(preferences.colorScheme);
}
