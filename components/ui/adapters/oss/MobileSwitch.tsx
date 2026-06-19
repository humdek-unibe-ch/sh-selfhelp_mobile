/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import { Switch } from 'heroui-native';
import { Text, View } from 'react-native';
import type { IMobileSwitchProps } from '../types';

/**
 * OSS MobileSwitch — real HeroUI Native `Switch` (compound `Switch`/
 * `Switch.Thumb`). Selection + disabled state and the animated thumb come
 * from HeroUI. Pro swaps in the HeroUI Pro switch.
 *
 * The row wrapper (`View`) and the optional inline `Text` label are layout
 * primitives: HeroUI Native exposes no generic body-text component (its
 * `Label` is a pressable form-field label tied to field context), so a plain
 * RN `Text` is the correct element for a descriptive switch label.
 */
export function MobileSwitch({
    isSelected = false,
    onSelectedChange,
    isDisabled,
    label,
    className,
    accessibilityLabel,
    testID,
}: IMobileSwitchProps): React.ReactElement {
    return (
        <View
            className={
                ['flex-row items-center justify-between gap-2', className]
                    .filter(Boolean)
                    .join(' ')
                    .trim() || undefined
            }
        >
            {label ? <Text className="text-base text-foreground">{label}</Text> : null}
            <Switch
                isSelected={isSelected}
                onSelectedChange={onSelectedChange}
                isDisabled={isDisabled}
                accessibilityLabel={accessibilityLabel ?? label}
                testID={testID}
            >
                <Switch.Thumb />
            </Switch>
        </View>
    );
}
