/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import { Text } from 'react-native';
import type { IMobileTextProps } from '../types';

const EMPHASIS_CLASS: Record<NonNullable<IMobileTextProps['emphasis']>, string> = {
    title: 'text-xl font-semibold text-foreground',
    body: 'text-base text-foreground',
    muted: 'text-sm text-muted-foreground',
};

/**
 * OSS MobileText — RN `Text` styled through Uniwind.
 *
 * FALLBACK (no HeroUI Native equivalent): HeroUI Native does not ship a
 * general-purpose body/typography component. Every text primitive it exposes
 * (`Label`, `Card.Title`, `Card.Description`, `Dialog.Title`/`Description`,
 * `Select.ItemLabel`) is bound to a specific parent component's context and
 * cannot be used as standalone body text. A plain RN `Text` is therefore the
 * correct primitive here. Pro may swap in HeroUI Pro typography if available.
 */
export function MobileText({
    children,
    emphasis = 'body',
    numberOfLines,
    className,
    accessibilityLabel,
    testID,
}: IMobileTextProps): React.ReactElement {
    const composed = [EMPHASIS_CLASS[emphasis], className].filter(Boolean).join(' ').trim();
    return (
        <Text
            className={composed || undefined}
            numberOfLines={numberOfLines}
            accessibilityLabel={accessibilityLabel}
            testID={testID}
        >
            {children}
        </Text>
    );
}
