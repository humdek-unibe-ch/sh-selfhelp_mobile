/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import { TextInput as RNTextInput } from 'react-native';
import type { IStyleProps } from '@/components/renderer/types';
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

    return (
        <FieldShell error={error} required={required} className={buildSectionClasses(section)}>
            <RNTextInput
                value={value}
                onChangeText={setValue}
                placeholder={placeholder}
                editable={!disabled}
                secureTextEntry={isPassword}
                keyboardType={isNumber ? 'numeric' : 'default'}
                autoCapitalize="none"
                style={{
                    borderWidth: 1,
                    borderColor: error ? '#fa5252' : '#dee2e6',
                    borderRadius: 4,
                    padding: 10,
                    backgroundColor: disabled ? '#f8f9fa' : '#fff',
                }}
            />
        </FieldShell>
    );
}
