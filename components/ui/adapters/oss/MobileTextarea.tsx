/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import { Label, TextArea, TextField } from 'heroui-native';
import type { IMobileTextareaProps } from '../types';
import { useAppColors } from '@/hooks/useAppColors';

/**
 * OSS MobileTextarea — real HeroUI Native `TextArea` (multiline `Input`) wrapped
 * in `TextField` + `Label`. `TextField` propagates `isDisabled` / `isInvalid` /
 * `isRequired` through context (Label renders the required asterisk, the field
 * reflects invalid styling), so validation state is exposed natively. `TextArea`
 * defaults to `multiline` + top-aligned text. Pro swaps in the HeroUI Pro field.
 *
 * Border visibility: like `MobileInput`, HeroUI's field separation relies on a
 * shadow that does not render on `react-native-web`, so we pin an explicit
 * theme-aware border + surface + text colour via the merged `style` prop.
 */
export function MobileTextarea({
    value,
    onChangeText,
    placeholder,
    label,
    isDisabled,
    isInvalid,
    isRequired,
    numberOfLines = 3,
    className,
    accessibilityLabel,
    testID,
}: IMobileTextareaProps): React.ReactElement {
    const colors = useAppColors();
    return (
        <TextField
            isDisabled={isDisabled}
            isInvalid={isInvalid}
            isRequired={isRequired}
            className={className || undefined}
        >
            {label ? <Label>{label}</Label> : null}
            <TextArea
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor={colors.textFaint}
                isDisabled={isDisabled}
                isInvalid={isInvalid}
                numberOfLines={numberOfLines}
                accessibilityLabel={accessibilityLabel ?? label}
                testID={testID}
                style={{
                    borderColor: isInvalid ? colors.danger : colors.border,
                    backgroundColor: colors.surface,
                    color: colors.text,
                    opacity: isDisabled ? 0.6 : 1,
                }}
            />
        </TextField>
    );
}
