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
 * `shared_color`, which Mantine applies to the web button via `color`. HeroUI
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

    return (
        <Button
            variant={variant}
            size={size}
            isIconOnly={isIconOnly}
            isDisabled={isDisabled || isLoading || false}
            onPress={onPress}
            style={accentColor ? { backgroundColor: accentColor } : undefined}
            className={composedClassName || undefined}
            accessibilityLabel={accessibilityLabel ?? label}
            accessibilityState={{ disabled: isDisabled || isLoading || false, busy: isLoading || false }}
            testID={testID}
        >
            {children ?? label ?? ''}
        </Button>
    );
}
