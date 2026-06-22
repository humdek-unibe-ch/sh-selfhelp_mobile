/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import { Checkbox } from 'heroui-native';
import { Text, View } from 'react-native';
import type { IMobileCheckboxProps } from '../types';

/**
 * OSS MobileCheckbox — real HeroUI Native `Checkbox` (compound `Checkbox`/
 * `Checkbox.Indicator`). Selection / disabled / invalid state and the
 * animated check indicator come from HeroUI. Pro swaps in the HeroUI Pro
 * checkbox.
 *
 * The row wrapper (`View`) and the optional inline `Text` label are layout
 * primitives: HeroUI Native has no generic body-text component, so a plain RN
 * `Text` is the correct element for the checkbox label.
 */
export function MobileCheckbox({
    isSelected = false,
    onSelectedChange,
    isDisabled,
    label,
    labelPosition = 'right',
    variant = 'primary',
    className,
    accessibilityLabel,
    testID,
}: IMobileCheckboxProps): React.ReactElement {
    // `left` places the label before the box (mirrors the web Mantine
    // `labelPosition="left"`); `right` keeps the default trailing label.
    const rowDirection = labelPosition === 'left' ? 'flex-row-reverse' : 'flex-row';
    return (
        <View
            className={
                [`${rowDirection} items-center gap-2`, className].filter(Boolean).join(' ').trim() ||
                undefined
            }
        >
            <Checkbox
                isSelected={isSelected}
                onSelectedChange={onSelectedChange}
                isDisabled={isDisabled}
                variant={variant}
                accessibilityLabel={accessibilityLabel ?? label}
                testID={testID}
            >
                <Checkbox.Indicator />
            </Checkbox>
            {label ? <Text className="text-base text-foreground">{label}</Text> : null}
        </View>
    );
}
