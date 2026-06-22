/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import { Platform, View } from 'react-native';
import { colorToHex } from '@selfhelp/shared';
import type { IStyleProps } from '@/components/renderer/types';
import { MobileInput } from '@/components/ui/adapters';
import { useAppColors } from '@/hooks/useAppColors';
import { buildSectionClasses } from '@/styles/sectionClasses';
import { readField, readBooleanField, useInterpolatedField } from '@/components/renderer/useField';
import { useFieldBinding } from './_useFieldBinding';
import { FieldShell } from './_FieldShell';

/**
 * ColorInput — OSS fallback: a colour swatch + a themed hex text field.
 *
 * - Web: the swatch is a real native browser colour picker (`<input
 *   type="color">`); picking a colour writes the hex back into the field, and
 *   typing a value updates the swatch.
 * - Native (iOS/Android): the swatch is a themed preview `View` and the value
 *   is entered through the themed `MobileInput`.
 *
 * Both surfaces are theme-aware (border/surface/text follow the active colour
 * scheme), fixing the previous hard-coded light-mode colours. ColorPicker reuses
 * this renderer. HeroUI Native has no colour picker; Pro can swap one in via the
 * `@selfhelp/mobile-pro-ui` adapter seam.
 */
export function ColorInput({ section, values }: IStyleProps): React.ReactElement {
    const name = readField<string>(section, 'name') ?? '';
    const label = useInterpolatedField(section, 'label', values);
    const description = useInterpolatedField(section, 'description', values);
    const placeholder = useInterpolatedField(section, 'placeholder', values) || '#228be6';
    const required = readBooleanField(section, 'is_required', false);
    const disabled = readBooleanField(section, 'disabled', false);
    const initial = readField<string>(section, 'value') ?? '';
    const { value, error, setValue } = useFieldBinding(name, initial);
    const colors = useAppColors();

    const resolved = colorToHex(value) ?? '';
    const swatchColor = resolved || colors.surfaceMuted;
    const pickerValue = /^#[0-9a-fA-F]{6}$/.test(resolved) ? resolved : '#ffffff';

    return (
        <FieldShell label={label} description={description} required={required} error={error} className={buildSectionClasses(section)}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {Platform.OS === 'web' ? (
                    <input
                        type="color"
                        value={pickerValue}
                        disabled={disabled}
                        aria-label={`${label ?? 'Colour'} picker`}
                        onChange={(e) => setValue(e.target.value)}
                        style={{
                            width: 44,
                            height: 44,
                            padding: 0,
                            borderWidth: 1,
                            borderStyle: 'solid',
                            borderColor: colors.border,
                            borderRadius: 8,
                            backgroundColor: 'transparent',
                            opacity: disabled ? 0.6 : 1,
                            cursor: disabled ? 'not-allowed' : 'pointer',
                        }}
                    />
                ) : (
                    <View
                        style={{
                            width: 44,
                            height: 44,
                            borderRadius: 8,
                            borderWidth: 1,
                            borderColor: colors.border,
                            backgroundColor: swatchColor,
                        }}
                    />
                )}
                <View style={{ flex: 1 }}>
                    <MobileInput
                        value={value}
                        onChangeText={setValue}
                        placeholder={placeholder}
                        isDisabled={disabled}
                        isInvalid={!!error}
                        isRequired={required}
                        autoCapitalize="characters"
                        accessibilityLabel={label}
                    />
                </View>
            </View>
        </FieldShell>
    );
}
