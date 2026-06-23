/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import { View } from 'react-native';
import type { IMobileContainerProps } from '../types';

/**
 * OSS MobileContainer — RN `View` with Uniwind classes + resolved padding.
 *
 * FALLBACK (no HeroUI Native equivalent): HeroUI Native has no neutral layout
 * container. Its closest primitive, `Surface`, is an opinionated themed
 * surface (background, border, elevation, variant) meant for card-like
 * regions, not a transparent flex box for arbitrary layout. Using `Surface`
 * here would impose unwanted background/border on every container, so a plain
 * RN `View` is the correct primitive. Pro may layer HeroUI Pro layout helpers.
 */
export function MobileContainer({
    children,
    fullWidth,
    paddingPx,
    className,
    accessibilityLabel,
    testID,
}: IMobileContainerProps): React.ReactElement {
    const composed = [fullWidth ? 'w-full' : null, className].filter(Boolean).join(' ').trim();
    return (
        <View
            className={composed || undefined}
            style={paddingPx !== undefined ? { padding: paddingPx } : undefined}
            accessibilityLabel={accessibilityLabel}
            testID={testID}
        >
            {children}
        </View>
    );
}
