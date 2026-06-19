/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import type { IStyleProps } from '@/components/renderer/types';
import { MobileInput } from '@/components/ui/adapters';
import { buildSectionClasses } from '@/styles/sectionClasses';
import { readField, readBooleanField } from '@/components/renderer/useField';
import { useFieldBinding } from './_useFieldBinding';
import { FieldShell } from './_FieldShell';

export function Input({ section }: IStyleProps): React.ReactElement {
    const name = readField<string>(section, 'name') ?? '';
    const placeholder = readField<string>(section, 'placeholder') ?? '';
    const initial = readField<string>(section, 'value') ?? '';
    const required = readBooleanField(section, 'is_required', false);
    const disabled = readBooleanField(section, 'disabled', false);
    const type = readField<string>(section, 'type_input') ?? 'text';

    const { value, error, setValue } = useFieldBinding(name, initial);
    const isPassword = type === 'password';
    const isNumber = type === 'number';

    // Renders through the swappable HeroUI Native TextField adapter (native
    // invalid/required state) on every platform, including web.
    return (
        <FieldShell error={error} required={required} className={buildSectionClasses(section)}>
            <MobileInput
                value={value}
                onChangeText={setValue}
                placeholder={placeholder}
                isDisabled={disabled}
                isInvalid={!!error}
                isRequired={required}
                secureTextEntry={isPassword}
                keyboardType={isNumber ? 'numeric' : 'default'}
            />
        </FieldShell>
    );
}
