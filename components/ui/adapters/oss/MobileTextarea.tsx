/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import { Label, TextArea, TextField } from 'heroui-native';
import type { IMobileTextareaProps } from '../types';

/**
 * OSS MobileTextarea — real HeroUI Native `TextArea` (multiline `Input`) wrapped
 * in `TextField` + `Label`. `TextField` propagates `isDisabled` / `isInvalid` /
 * `isRequired` through context (Label renders the required asterisk, the field
 * reflects invalid styling), so validation state is exposed natively. `TextArea`
 * defaults to `multiline` + top-aligned text. Pro swaps in the HeroUI Pro field.
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
                isDisabled={isDisabled}
                isInvalid={isInvalid}
                numberOfLines={numberOfLines}
                accessibilityLabel={accessibilityLabel ?? label}
                testID={testID}
            />
        </TextField>
    );
}
