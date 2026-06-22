/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import { Platform } from 'react-native';
import type { IStyleProps } from '@/components/renderer/types';
import { MobileInput } from '@/components/ui/adapters';
import { useAppColors } from '@/hooks/useAppColors';
import { buildSectionClasses } from '@/styles/sectionClasses';
import { readField, readBooleanField, useInterpolatedField } from '@/components/renderer/useField';
import { useFieldBinding } from './_useFieldBinding';
import { FieldShell } from './_FieldShell';

/**
 * DatePicker — OSS fallback.
 *
 * - Web: a real, themed native browser date picker (`<input type="date">`). On
 *   `react-native-web` the tree is ReactDOM, so a DOM input renders a genuine
 *   calendar UI (previously the field was a plain text box — "not working").
 *   `colorScheme` keeps the calendar/spinner chrome readable in dark mode.
 * - Native (iOS/Android): an ISO-date text field through the themed HeroUI
 *   Native `MobileInput`.
 *
 * HeroUI Native **Pro** override (RF-26): `DatePicker` / `Calendar` /
 * `DateField` / `DateRangePicker` / `DateTimePicker` / `TimePicker` /
 * `WheelDateTimePicker` / `WheelTimePicker`, swapped in by the Pro mobile build
 * via the `@selfhelp/mobile-pro-ui` adapter seam. Same CMS fields either way.
 */
export function DatePicker({ section, values }: IStyleProps): React.ReactElement {
    const name = readField<string>(section, 'name') ?? '';
    const label = useInterpolatedField(section, 'label', values);
    const description = useInterpolatedField(section, 'description', values);
    const placeholder = useInterpolatedField(section, 'datepicker_placeholder', values) || 'YYYY-MM-DD';
    const required = readBooleanField(section, 'is_required', false);
    const disabled = readBooleanField(section, 'disabled', false);
    const initial = readField<string>(section, 'value') ?? '';
    const { value, error, setValue } = useFieldBinding(name, initial);
    const colors = useAppColors();

    return (
        <FieldShell label={label} description={description} required={required} error={error} className={buildSectionClasses(section)}>
            {Platform.OS === 'web' ? (
                <input
                    type="date"
                    value={value}
                    disabled={disabled}
                    aria-label={label}
                    onChange={(e) => setValue(e.target.value)}
                    style={{
                        height: 48,
                        paddingLeft: 12,
                        paddingRight: 12,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderStyle: 'solid',
                        borderColor: error ? colors.danger : colors.border,
                        backgroundColor: colors.surface,
                        color: colors.text,
                        fontSize: 16,
                        width: '100%',
                        boxSizing: 'border-box',
                        opacity: disabled ? 0.6 : 1,
                        colorScheme: colors.isDark ? 'dark' : 'light',
                    }}
                />
            ) : (
                <MobileInput
                    value={value}
                    onChangeText={setValue}
                    placeholder={placeholder}
                    isDisabled={disabled}
                    isInvalid={!!error}
                    isRequired={required}
                    accessibilityLabel={label}
                />
            )}
        </FieldShell>
    );
}
