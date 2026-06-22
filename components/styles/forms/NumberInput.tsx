/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import type { IStyleProps } from '@/components/renderer/types';
import { MobileInput } from '@/components/ui/adapters';
import { buildSectionClasses } from '@/styles/sectionClasses';
import { readField, readBooleanField, useInterpolatedField } from '@/components/renderer/useField';
import { useFieldBinding } from './_useFieldBinding';
import { FieldShell } from './_FieldShell';

/**
 * NumberInput — OSS fallback: a numeric field rendered through the themed
 * HeroUI Native `MobileInput` adapter (so the surface/border/text follow the
 * active colour scheme on every platform, including Expo-web dark mode). HeroUI
 * Native **Pro** override (RF-29): `NumberField` / `NumberStepper` / `NumberPad`,
 * swapped in by the Pro mobile build via the `@selfhelp/mobile-pro-ui` adapter
 * seam. Same CMS fields either way.
 */
export function NumberInput({ section, values }: IStyleProps): React.ReactElement {
    const name = readField<string>(section, 'name') ?? '';
    const label = useInterpolatedField(section, 'label', values);
    const description = useInterpolatedField(section, 'description', values);
    const placeholder = useInterpolatedField(section, 'placeholder', values);
    const required = readBooleanField(section, 'is_required', false);
    const disabled = readBooleanField(section, 'disabled', false);
    const initial = readField<string>(section, 'value') ?? '';
    const { value, error, setValue } = useFieldBinding(name, initial);

    return (
        <FieldShell label={label} description={description} required={required} error={error} className={buildSectionClasses(section)}>
            <MobileInput
                value={value}
                onChangeText={(t) => setValue(t.replace(/[^0-9.\-]/g, ''))}
                placeholder={placeholder}
                isDisabled={disabled}
                isInvalid={!!error}
                isRequired={required}
                keyboardType="numeric"
                accessibilityLabel={label}
            />
        </FieldShell>
    );
}
