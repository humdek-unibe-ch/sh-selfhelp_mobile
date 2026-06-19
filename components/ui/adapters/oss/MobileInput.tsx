/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import { Input, Label, TextField } from 'heroui-native';
import type { IMobileInputProps } from '../types';

/**
 * OSS MobileInput — real HeroUI Native `TextField` wrapper around `Label` +
 * `Input`. `TextField` propagates `isDisabled` / `isInvalid` / `isRequired`
 * to its children through context (the `Label` renders the required asterisk
 * and the `Input` reflects the invalid styling), so validation state is
 * exposed natively instead of via hand-rolled classes. Pro swaps in the
 * HeroUI Pro field.
 */
export function MobileInput({
    value,
    onChangeText,
    placeholder,
    label,
    isDisabled,
    isInvalid,
    isRequired,
    secureTextEntry,
    keyboardType = 'default',
    className,
    accessibilityLabel,
    testID,
}: IMobileInputProps): React.ReactElement {
    return (
        <TextField
            isDisabled={isDisabled}
            isInvalid={isInvalid}
            isRequired={isRequired}
            className={className || undefined}
        >
            {label ? <Label>{label}</Label> : null}
            <Input
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                secureTextEntry={secureTextEntry}
                keyboardType={keyboardType}
                isDisabled={isDisabled}
                isInvalid={isInvalid}
                accessibilityLabel={accessibilityLabel ?? label}
                testID={testID}
            />
        </TextField>
    );
}
