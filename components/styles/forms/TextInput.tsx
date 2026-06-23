/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import type { IStyleProps } from '@/components/renderer/types';
import { MobileInput } from '@/components/ui/adapters';
import { buildSectionClasses } from '@/styles/sectionClasses';
import { readField, readBooleanField, readNumberField, useInterpolatedField } from '@/components/renderer/useField';
import { useFieldBinding } from './_useFieldBinding';
import { FieldShell } from './_FieldShell';

export function TextInput({ section, values }: IStyleProps): React.ReactElement {
    const name = readField<string>(section, 'name') ?? '';
    const label = useInterpolatedField(section, 'label', values);
    const description = useInterpolatedField(section, 'description', values);
    const placeholder = useInterpolatedField(section, 'placeholder', values);
    const initial = readField<string>(section, 'value') ?? '';
    const required = readBooleanField(section, 'is_required', false);
    const disabled = readBooleanField(section, 'disabled', false);
    const maxLength = readNumberField(section, 'max_length');
    const secureTextEntry = readBooleanField(section, 'mobile_secure_entry', false);
    const keyboardType = (readField<string>(section, 'mobile_keyboard_type') || undefined) as
        | 'default' | 'email-address' | 'numeric' | 'phone-pad' | 'url' | undefined;
    const autoCapitalize = (readField<string>(section, 'mobile_auto_capitalize') || undefined) as
        | 'none' | 'sentences' | 'words' | 'characters' | undefined;
    // mobile-only: HeroUI Native field variant (primary bordered | secondary filled).
    const variant = (readField<string>(section, 'mobile_input_variant') || undefined) as
        | 'primary' | 'secondary' | undefined;

    const { value, error, setValue } = useFieldBinding(name, initial);

    // Renders through the swappable HeroUI Native TextField adapter on every
    // platform, including web. Label/description/error stay on FieldShell so the
    // adapter renders the control only (no duplicate label).
    return (
        <FieldShell label={label} description={description} required={required} error={error} className={buildSectionClasses(section)}>
            <MobileInput
                value={value}
                onChangeText={setValue}
                placeholder={placeholder}
                isDisabled={disabled}
                isInvalid={!!error}
                isRequired={required}
                maxLength={maxLength}
                secureTextEntry={secureTextEntry}
                keyboardType={keyboardType}
                autoCapitalize={autoCapitalize}
                variant={variant}
                accessibilityLabel={label}
            />
        </FieldShell>
    );
}
