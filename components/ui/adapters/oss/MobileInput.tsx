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
 * explicit, theme-aware colour through the `style` prop (HeroUI merges it:
 * `style={[borderCurve, style]}`), guaranteeing a visible field on every
 * platform and both colour schemes. `variant` (from `mobile_input_variant`)
 * switches the look: `primary` is the bordered field; `secondary` is the filled
 * field (muted inset fill, no outline). The invalid state always keeps the
 * danger border. The same `variant` is forwarded to HeroUI's `Input` so native
 * also renders the matching variant.
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
    variant = 'primary',
    className,
    accessibilityLabel,
    testID,
}: IMobileInputProps): React.ReactElement {
    const colors = useAppColors();
    const isFilled = variant === 'secondary';
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
                variant={variant}
                isDisabled={isDisabled}
                isInvalid={isInvalid}
                accessibilityLabel={accessibilityLabel ?? label}
                testID={testID}
                style={{
                    borderColor: isInvalid ? colors.danger : isFilled ? 'transparent' : colors.border,
                    backgroundColor: isFilled ? colors.surfaceMuted : colors.surface,
                    color: colors.text,
                    opacity: isDisabled ? 0.6 : 1,
                }}
            />
        </TextField>
    );
}
