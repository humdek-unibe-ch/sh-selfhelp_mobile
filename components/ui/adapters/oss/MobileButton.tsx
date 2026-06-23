/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import { Button } from 'heroui-native';
import type { IMobileButtonProps } from '../types';

/**
 * OSS MobileButton — wraps the open `heroui-native` Button. The Pro tier
 * swaps this for a polished HeroUI Pro button via `@selfhelp/mobile-pro-ui`.
 *
 * HeroUI's Button renders string children as a label automatically and
 * derives intent/size from the normalized props produced by the shared
 * semantic mapper.
 *
 * `accentColor` (resolved hex) overrides the variant's themed fill so a CMS
 * style can colour the button for cross-platform parity — e.g. `login`'s
 * `color`, which Mantine applies to the web button via `color`. HeroUI
 * paints the fill through a `bg-*` class (`bg-accent` for `primary`); the inline
 * `style` background wins over that class while the variant keeps its readable
 * foreground (white label on a filled button), so passing `accentColor` with the
 * default `primary` variant yields a coloured button with legible text.
 */
export function MobileButton({
    label,
    onPress,
    variant = 'primary',
    size = 'md',
    isDisabled,
    isLoading,
    isIconOnly = false,
    fullWidth,
    feedbackVariant,
    accentColor,
    className,
    accessibilityLabel,
    testID,
    children,
}: IMobileButtonProps): React.ReactElement {
    const composedClassName = [fullWidth ? 'w-full' : null, className]
        .filter(Boolean)
        .join(' ')
        .trim();

    // Shared across every feedback variant. HeroUI's Button props are a
    // discriminated union on `feedbackVariant` (it only narrows the unused
    // `animation` prop), so the literal must be set on the element itself — we
    // branch below instead of passing a variable.
    const base = {
        variant,
        size,
        isIconOnly,
        isDisabled: isDisabled || isLoading || false,
        onPress,
        style: accentColor ? { backgroundColor: accentColor } : undefined,
        className: composedClassName || undefined,
        accessibilityLabel: accessibilityLabel ?? label,
        accessibilityState: { disabled: isDisabled || isLoading || false, busy: isLoading || false },
        testID,
    };
    const child = children ?? label ?? '';

    switch (feedbackVariant) {
        case 'scale-ripple':
            return <Button {...base} feedbackVariant="scale-ripple">{child}</Button>;
        case 'scale':
            return <Button {...base} feedbackVariant="scale">{child}</Button>;
        case 'none':
            return <Button {...base} feedbackVariant="none">{child}</Button>;
        case 'scale-highlight':
        default:
            return <Button {...base} feedbackVariant="scale-highlight">{child}</Button>;
    }
}
