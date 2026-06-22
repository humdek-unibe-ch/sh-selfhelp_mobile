/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import { Input, Label, TextField } from 'heroui-native';
import type { IMobileInputProps } from '../types';
import { useAppColors } from '@/hooks/useAppColors';

/**
 * OSS MobileInput — real HeroUI Native `TextField` wrapper around `Label` +
 * `Input`. `TextField` propagates `isDisabled` / `isInvalid` / `isRequired`
 * to its children through context (the `Label` renders the required asterisk
 * and the `Input` reflects the invalid styling), so validation state is
 * exposed natively instead of via hand-rolled classes. Pro swaps in the
 * HeroUI Pro field.
 *
 * Border visibility: HeroUI Native's `Input` draws its separation with a
 * SHADOW (its `border-field` colour equals the `bg-field` fill by design), and
 * RN shadows do not render on `react-native-web` — so on the Expo-web build the
 * field looks borderless (white-on-white in light mode). We therefore pin an
 * explicit, theme-aware border + surface + text colour through the `style` prop
 * (HeroUI merges it: `style={[borderCurve, style]}`), guaranteeing a visible
 * outline on every platform and both colour schemes. The invalid state keeps
 * the danger border.
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
    maxLength,
    autoCapitalize,
    className,
    accessibilityLabel,
    testID,
}: IMobileInputProps): React.ReactElement {
    const colors = useAppColors();
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
                placeholderTextColor={colors.textFaint}
                secureTextEntry={secureTextEntry}
                keyboardType={keyboardType}
                maxLength={maxLength}
                autoCapitalize={autoCapitalize}
                isDisabled={isDisabled}
                isInvalid={isInvalid}
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
