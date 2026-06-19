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
            className={composedClassName || undefined}
            accessibilityLabel={accessibilityLabel ?? label}
            accessibilityState={{ disabled: isDisabled || isLoading || false, busy: isLoading || false }}
            testID={testID}
        >
            {children ?? label ?? ''}
        </Button>
    );
}
